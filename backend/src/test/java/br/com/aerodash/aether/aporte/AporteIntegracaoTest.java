package br.com.aerodash.aether.aporte;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.aerodash.aether.aeronave.AeronaveRepository;
import br.com.aerodash.aether.comum.config.FusoDoNegocio;
import br.com.aerodash.aether.proprietario.ProprietarioRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import java.time.Clock;
import java.time.LocalDate;
import java.time.YearMonth;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
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
 * Aportes e rendimentos contra um PostgreSQL de verdade: a competência gravada no dia 1 e lida de
 * volta como mês, o recorte por período, a porta respondida pelos contratos e o ciclo
 * registrar/excluir pela borda HTTP.
 *
 * <p>Exige Docker. Fica fora do {@code check}: rode com {@code ./gradlew testeIntegracao}.
 */
@Tag("integracao")
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@DisplayName("Aportes (integração)")
class AporteIntegracaoTest {

  @Container @ServiceConnection
  static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

  private static final String SENHA = "aether-dev-2026";

  @Autowired private MockMvc mockMvc;
  @Autowired private AeronaveRepository aeronaves;
  @Autowired private ProprietarioRepository proprietarios;
  @Autowired private ObjectMapper json;
  @Autowired private Clock relogio;

  @Test
  @DisplayName("o seed sai recortado por período, com o total somado no servidor")
  void seedPorPeriodo() throws Exception {
    Long psMep = aeronaves.findByMatricula("PS-MEP").orElseThrow().getId();
    YearMonth ultima = YearMonth.now(relogio).minusMonths(1);

    mockMvc
        .perform(
            get("/aportes?aeronave=%d&de=%s&ate=%s".formatted(psMep, ultima, ultima))
                .cookie(entrar()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.aportes.length()").value(2))
        .andExpect(jsonPath("$.aportes[0].competencia").value(ultima.toString()))
        .andExpect(jsonPath("$.total").value(40000.00));

    mockMvc
        .perform(get("/rendimentos?aeronave=" + psMep).cookie(entrar()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.rendimentos.length()").value(3))
        .andExpect(jsonPath("$.total").value(2517.57));
  }

  @Test
  @DisplayName("registrar e excluir um aporte; quem não está no contrato é recusado")
  void registrarEExcluir() throws Exception {
    Long psMep = aeronaves.findByMatricula("PS-MEP").orElseThrow().getId();
    Long helena = proprietarioChamado("Helena Sarraf");
    Cookie sessao = entrar();
    LocalDate hoje = FusoDoNegocio.hoje(relogio);
    String corpo =
        """
        {"aeronaveId":%d,"proprietarioId":%d,"data":"%s","competencia":"%s","valor":10000.00}
        """;

    MvcResult criado =
        mockMvc
            .perform(
                post("/aportes")
                    .cookie(sessao)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(corpo.formatted(psMep, helena, hoje, YearMonth.from(hoje))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.nomeDoProprietario").value("Helena Sarraf"))
            .andReturn();
    long id = json.readTree(criado.getResponse().getContentAsString()).get("id").asLong();
    mockMvc.perform(delete("/aportes/" + id).cookie(sessao)).andExpect(status().isNoContent());

    Long prKrt = aeronaves.findByMatricula("PR-KRT").orElseThrow().getId();
    mockMvc
        .perform(
            post("/aportes")
                .cookie(sessao)
                .contentType(MediaType.APPLICATION_JSON)
                .content(corpo.formatted(prKrt, helena, hoje, YearMonth.from(hoje))))
        .andExpect(status().isBadRequest())
        .andExpect(
            jsonPath("$.campos.proprietarioId")
                .value(org.hamcrest.Matchers.containsString("nunca participou")));
  }

  @ParameterizedTest(name = "competência {0} e valor {1}: 400 em campos.{2}")
  @CsvSource({
    "2026-09, 0.001, valor",
    "2026-09, 1000000000000000, valor",
    "0000-01, 10, competencia",
    "20266-09, 10, competencia"
  })
  @DisplayName("o aporte que o banco arredondava, recusava com 500 ou escondia volta 400 no campo")
  void aporteForaDosLimites(String competencia, String valor, String campo) throws Exception {
    Long psMep = aeronaves.findByMatricula("PS-MEP").orElseThrow().getId();
    Long ricardo = proprietarioChamado("Ricardo Meirelles");

    mockMvc
        .perform(
            post("/aportes")
                .cookie(entrar())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"aeronaveId":%d,"proprietarioId":%d,"data":"%s","competencia":"%s","valor":%s}
                    """
                        .formatted(
                            psMep, ricardo, FusoDoNegocio.hoje(relogio), competencia, valor)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos." + campo).isNotEmpty());
  }

  @Test
  @DisplayName("a taxa que a coluna não comporta volta 400 no campo, e não 500")
  void taxaForaDaColuna() throws Exception {
    Long psMep = aeronaves.findByMatricula("PS-MEP").orElseThrow().getId();

    mockMvc
        .perform(
            post("/rendimentos")
                .cookie(entrar())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"aeronaveId":%d,"data":"%s","aplicacao":"CDB","taxa":1000,"valor":1}
                    """
                        .formatted(psMep, FusoDoNegocio.hoje(relogio))))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.taxa").isNotEmpty());
  }

  private Long proprietarioChamado(String nome) {
    return proprietarios.findAll().stream()
        .filter(dono -> dono.getNome().equals(nome))
        .findFirst()
        .orElseThrow()
        .getId();
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
