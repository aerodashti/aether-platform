package br.com.aerodash.aether.voo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.aerodash.aether.aeronave.Aeronave;
import br.com.aerodash.aether.aeronave.AeronaveRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * O diário contra um PostgreSQL de verdade: o seed do mês corrente, o lançamento alimentando os
 * contadores e a exclusão estornando, tudo pela borda HTTP.
 *
 * <p>Exige Docker. Fica fora do {@code check}: rode com {@code ./gradlew testeIntegracao}.
 */
@Tag("integracao")
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@DisplayName("Diário de voos (integração)")
class VooIntegracaoTest {

  @Container @ServiceConnection
  static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

  private static final String SENHA = "aether-dev-2026";

  @Autowired private MockMvc mockMvc;
  @Autowired private AeronaveRepository aeronaves;
  @Autowired private VooService voos;
  @Autowired private ObjectMapper json;

  @Test
  @DisplayName("o seed traz o voo de duas pernas e o voo de manutenção sem atribuição")
  void seedDoDiario() throws Exception {
    Long psMep = aeronaves.findByMatricula("PS-MEP").orElseThrow().getId();

    // Sem filtro de competência: as datas do seed são relativas a hoje e podem cruzar o início
    // do mês — o filtro tem teste próprio, determinístico.
    mockMvc
        .perform(get("/voos?aeronave=" + psMep).cookie(entrar()))
        .andExpect(status().isOk())
        .andExpect(
            jsonPath("$.trechos[?(@.relatorioDeVoo=='RV-2026-041')].numeroDoTrecho")
                .value(org.hamcrest.Matchers.containsInAnyOrder(1, 2)))
        .andExpect(
            jsonPath("$.trechos[?(@.relatorioDeVoo=='RV-2026-043')].vooDeManutencao").value(true))
        // Quatro trechos, mas o RV-2026-042 só tem o previsto: os totais são do realizado.
        .andExpect(jsonPath("$.trechos.length()").value(4))
        .andExpect(jsonPath("$.totais.pousos").value(3))
        .andExpect(jsonPath("$.totais.km").value(788.0));
  }

  @Test
  @DisplayName("lançamentos simultâneos na mesma aeronave chegam todos aos contadores")
  void lancamentosSimultaneosNaoSePerdem() throws Exception {
    Aeronave ptXlb = aeronaves.findByMatricula("PT-XLB").orElseThrow();
    int ciclosAntes = ptXlb.getContadores().ciclos();
    BigDecimal kmAntes = ptXlb.getContadores().kmVoados();
    int lancamentos = 8;
    ExecutorService pilotos = Executors.newFixedThreadPool(lancamentos);
    CountDownLatch largada = new CountDownLatch(1);
    List<Future<TrechoResponse>> resultados = new ArrayList<>();

    for (int indice = 1; indice <= lancamentos; indice++) {
      TrechoRequest trecho = voadoEm(ptXlb.getId(), "RV-SIMULTANEO-" + indice);
      resultados.add(
          pilotos.submit(
              () -> {
                largada.await();
                return voos.criar(trecho);
              }));
    }
    largada.countDown();
    List<Long> criados = new ArrayList<>();
    for (Future<TrechoResponse> resultado : resultados) {
      criados.add(resultado.get(30, TimeUnit.SECONDS).id());
    }
    pilotos.shutdown();

    Aeronave depois = aeronaves.findById(ptXlb.getId()).orElseThrow();
    assertThat(depois.getContadores().ciclos()).isEqualTo(ciclosAntes + lancamentos);
    assertThat(depois.getContadores().kmVoados())
        .isEqualByComparingTo(
            kmAntes.add(BigDecimal.TEN.multiply(BigDecimal.valueOf(lancamentos))));
    criados.forEach(voos::excluir);
  }

  @Test
  @DisplayName(
      "relançar o trecho de um voo do seed não é bloqueado, e o Rel. Voo vai em maiúsculas")
  void trechoRepetidoNaoEhBloqueado() throws Exception {
    Long psMep = aeronaves.findByMatricula("PS-MEP").orElseThrow().getId();
    Cookie sessao = entrar();

    MvcResult criado =
        mockMvc
            .perform(
                post("/voos")
                    .cookie(sessao)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(json.writeValueAsString(voadoEm(psMep, "  rv-2026-041 "))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.relatorioDeVoo").value("RV-2026-041"))
            .andReturn();

    long id = json.readTree(criado.getResponse().getContentAsString()).get("id").asLong();
    mockMvc.perform(delete("/voos/" + id).cookie(sessao)).andExpect(status().isNoContent());
  }

  /** Um trecho de 1 h e 10 km já voado, nº 1 do Rel. Voo dado. */
  private static TrechoRequest voadoEm(Long aeronaveId, String relatorioDeVoo) {
    return new TrechoRequest(
        aeronaveId,
        relatorioDeVoo,
        1,
        LocalDate.parse("2026-09-09"),
        "SBJD",
        "SBGR",
        BigDecimal.TEN,
        null,
        null,
        OffsetDateTime.parse("2026-09-09T13:00:00Z"),
        OffsetDateTime.parse("2026-09-09T14:00:00Z"),
        null,
        null);
  }

  @Test
  @DisplayName("lançar soma nos contadores e excluir devolve tudo")
  void lancarEExcluirMexemNosContadores() throws Exception {
    Aeronave prKrt = aeronaves.findByMatricula("PR-KRT").orElseThrow();
    BigDecimal horasAntes = prKrt.getContadores().horasDeCelula();
    int ciclosAntes = prKrt.getContadores().ciclos();
    Cookie sessao = entrar();

    MvcResult criado =
        mockMvc
            .perform(
                post("/voos")
                    .cookie(sessao)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {"aeronaveId":%d,"relatorioDeVoo":"RV-2026-090","numeroDoTrecho":1,
                         "data":"2026-09-09","origem":"sbjd","destino":"sbgr","km":42.0,
                         "partidaPrevista":"2026-09-09T13:00:00Z","pousoPrevisto":"2026-09-09T13:30:00Z",
                         "partidaRealizada":"2026-09-09T13:00:00-03:00",
                         "pousoRealizado":"2026-09-09T13:30:00-03:00"}
                        """
                            .formatted(prKrt.getId())))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.origem").value("SBJD"))
            .andExpect(jsonPath("$.horas").value(0.5))
            .andReturn();
    long id = json.readTree(criado.getResponse().getContentAsString()).get("id").asLong();

    Aeronave depois = aeronaves.findById(prKrt.getId()).orElseThrow();
    assertThat(depois.getContadores().horasDeCelula())
        .isEqualByComparingTo(horasAntes.add(new BigDecimal("0.5")));
    assertThat(depois.getContadores().ciclos()).isEqualTo(ciclosAntes + 1);

    mockMvc.perform(delete("/voos/" + id).cookie(sessao)).andExpect(status().isNoContent());

    Aeronave aoFinal = aeronaves.findById(prKrt.getId()).orElseThrow();
    assertThat(aoFinal.getContadores().horasDeCelula()).isEqualByComparingTo(horasAntes);
    assertThat(aoFinal.getContadores().ciclos()).isEqualTo(ciclosAntes);
  }

  @Test
  @DisplayName("o filtro de competência tipa a data no banco — a regressão do ? is null")
  void filtroDeCompetenciaFunciona() throws Exception {
    // Uma competência sem nenhum voo: o que importa é a consulta executar, não o volume.
    mockMvc
        .perform(get("/voos?competencia=2001-01").cookie(entrar()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.trechos.length()").value(0))
        .andExpect(jsonPath("$.totais.pousos").value(0));
  }

  private Cookie entrar() throws Exception {
    MvcResult resultado =
        mockMvc
            .perform(
                post("/autenticacao/entrar")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {"email":"leonardo@administraair.com.br","senha":"%s"}
                        """
                            .formatted(SENHA)))
            .andExpect(status().isOk())
            .andReturn();
    return resultado.getResponse().getCookie("aether_sessao");
  }
}
