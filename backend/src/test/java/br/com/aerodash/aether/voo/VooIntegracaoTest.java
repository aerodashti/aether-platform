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
        .andExpect(jsonPath("$.totais.pousos").value(4));
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
                         "partidaPrevista":"10:00","pousoPrevisto":"10:30"}
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
