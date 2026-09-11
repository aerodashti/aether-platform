package br.com.aerodash.aether.custo;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.aerodash.aether.aeronave.AeronaveRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
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
 * Os lançamentos contra um PostgreSQL de verdade: o seed com USD derivado, o CHECK de coerência do
 * câmbio e o ciclo lançar/excluir pela borda HTTP.
 *
 * <p>Exige Docker. Fica fora do {@code check}: rode com {@code ./gradlew testeIntegracao}.
 */
@Tag("integracao")
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@DisplayName("Custos (integração)")
class CustoIntegracaoTest {

  @Container @ServiceConnection
  static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

  private static final String SENHA = "aether-dev-2026";

  @Autowired private MockMvc mockMvc;
  @Autowired private AeronaveRepository aeronaves;
  @Autowired private ObjectMapper json;

  @Test
  @DisplayName("o seed sai com fixos e variáveis somados e o USD com o BRL derivado")
  void seedComTotais() throws Exception {
    Long psMep = aeronaves.findByMatricula("PS-MEP").orElseThrow().getId();

    mockMvc
        .perform(get("/custos?aeronave=" + psMep).cookie(entrar()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.custos[?(@.moeda=='USD')].valor").value(5906.76))
        .andExpect(jsonPath("$.custos[?(@.moeda=='USD')].valorOriginal").value(1200.00))
        .andExpect(jsonPath("$.totais.fixos").value(30940.00))
        .andExpect(jsonPath("$.totais.variaveis").value(21631.76));
  }

  @Test
  @DisplayName("lançar em USD deriva o BRL no ato; excluir remove")
  void lancarUsdEExcluir() throws Exception {
    Long prKrt = aeronaves.findByMatricula("PR-KRT").orElseThrow().getId();
    Cookie sessao = entrar();

    MvcResult criado =
        mockMvc
            .perform(
                post("/custos")
                    .cookie(sessao)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {"aeronaveId":%d,"categoria":"TARIFAS_AEROPORTUARIAS",
                         "data":"2026-09-09","descricao":"Handling KMIA","moeda":"USD",
                         "valor":800.00,"cambio":5.0000}
                        """
                            .formatted(prKrt)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.valor").value(4000.00))
            .andExpect(jsonPath("$.tipo").value("VARIAVEL"))
            .andReturn();
    long id = json.readTree(criado.getResponse().getContentAsString()).get("id").asLong();

    mockMvc.perform(delete("/custos/" + id).cookie(sessao)).andExpect(status().isNoContent());
    mockMvc
        .perform(get("/custos?aeronave=" + prKrt).cookie(entrar()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.custos[?(@.id==%d)]".formatted(id)).isEmpty());
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
