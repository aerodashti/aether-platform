package br.com.aerodash.aether.aporte;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.aerodash.aether.aeronave.AeronaveRepository;
import br.com.aerodash.aether.proprietario.ProprietarioRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import java.time.Clock;
import java.time.LocalDate;
import java.time.YearMonth;
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
    Long helena =
        proprietarios.findAll().stream()
            .filter(dono -> dono.getNome().equals("Helena Sarraf"))
            .findFirst()
            .orElseThrow()
            .getId();
    Cookie sessao = entrar();
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
                    .content(
                        corpo.formatted(
                            psMep, helena, LocalDate.now(relogio), YearMonth.now(relogio))))
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
                .content(
                    corpo.formatted(prKrt, helena, LocalDate.now(relogio), YearMonth.now(relogio))))
        .andExpect(status().isBadRequest())
        .andExpect(
            jsonPath("$.detail").value(org.hamcrest.Matchers.containsString("nunca participou")));
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
