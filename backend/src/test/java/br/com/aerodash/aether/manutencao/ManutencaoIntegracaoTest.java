package br.com.aerodash.aether.manutencao;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.aerodash.aether.aeronave.AeronaveRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import java.time.LocalDate;
import java.time.ZoneOffset;
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
 * A manutenção contra um PostgreSQL de verdade: o seed com os três estados de parâmetro, o ciclo
 * agendar → concluir → reabrir pela borda HTTP, a coluna da conclusão e o nome único por aeronave.
 *
 * <p>Exige Docker. Fica fora do {@code check}: rode com {@code ./gradlew testeIntegracao}.
 */
@Tag("integracao")
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@DisplayName("Manutenção (integração)")
class ManutencaoIntegracaoTest {

  @Container @ServiceConnection
  static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

  private static final String SENHA = "aether-dev-2026";
  private static final MediaType JSON = MediaType.APPLICATION_JSON;

  @Autowired private MockMvc mockMvc;
  @Autowired private AeronaveRepository aeronaves;
  @Autowired private ObjectMapper json;

  @Test
  @DisplayName("o seed julga os três estados: em dia, em atenção e estourado")
  void seedJulgado() throws Exception {
    Long psMep = aeronaves.findByMatricula("PS-MEP").orElseThrow().getId();

    mockMvc
        .perform(get("/manutencoes?aeronave=" + psMep).cookie(entrar()))
        .andExpect(status().isOk())
        .andExpect(
            jsonPath("$.parametros[?(@.nome=='Inspeção de célula — 4.000 h')].situacao")
                .value("REGULAR"))
        .andExpect(jsonPath("$.parametros[?(@.tipo=='CICLOS')].situacao").value("ATENCAO"))
        .andExpect(
            jsonPath("$.parametros[?(@.nome=='Pesagem regulamentar')].situacao").value("ESTOURADO"))
        .andExpect(jsonPath("$.historico[0].descricao").value("Troca de pneus e freios"))
        .andExpect(jsonPath("$.historico[0].concluidaEm").exists());
  }

  @Test
  @DisplayName("agendar, concluir no dia informado, recusar a correção e reabrir pela borda")
  void cicloCompleto() throws Exception {
    Long prKrt = aeronaves.findByMatricula("PR-KRT").orElseThrow().getId();
    Cookie sessao = entrar();
    LocalDate hoje = LocalDate.now(ZoneOffset.UTC);
    String corpo =
        """
        {"aeronaveId":%d,"data":"%s","hora":"09:00",
         "responsavel":"TAP M&E","descricao":"Inspeção anual","valor":52000}
        """
            .formatted(prKrt, hoje.plusDays(5));

    MvcResult criada =
        mockMvc
            .perform(post("/manutencoes").cookie(sessao).contentType(JSON).content(corpo))
            .andExpect(status().isCreated())
            .andReturn();
    long id = json.readTree(criada.getResponse().getContentAsString()).get("id").asLong();

    mockMvc
        .perform(
            post("/manutencoes/" + id + "/conclusao")
                .cookie(sessao)
                .contentType(JSON)
                .content("{\"concluidaEm\":\"%s\"}".formatted(hoje.minusDays(1))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("CONCLUIDA"))
        .andExpect(jsonPath("$.concluidaEm").value(hoje.minusDays(1).toString()));
    mockMvc
        .perform(put("/manutencoes/" + id).cookie(sessao).contentType(JSON).content(corpo))
        .andExpect(status().isConflict());
    mockMvc
        .perform(get("/manutencoes?aeronave=" + prKrt).cookie(sessao))
        .andExpect(jsonPath("$.historico[0].concluidaEm").value(hoje.minusDays(1).toString()));
    mockMvc
        .perform(post("/manutencoes/" + id + "/reabertura").cookie(sessao))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("PROGRAMADA"))
        .andExpect(jsonPath("$.concluidaEm").doesNotExist());
  }

  @Test
  @DisplayName("o nome do parâmetro não se repete na aeronave, nem com outra caixa")
  void nomeDeParametroUnico() throws Exception {
    Long prKrt = aeronaves.findByMatricula("PR-KRT").orElseThrow().getId();
    Cookie sessao = entrar();
    String corpo =
        """
        {"aeronaveId":%d,"nome":"%s","tipo":"HORAS","limite":4000,"aviso":100}
        """;

    mockMvc
        .perform(
            post("/manutencoes/parametros")
                .cookie(sessao)
                .contentType(JSON)
                .content(corpo.formatted(prKrt, "Hélice — overhaul")))
        .andExpect(status().isCreated());
    mockMvc
        .perform(
            post("/manutencoes/parametros")
                .cookie(sessao)
                .contentType(JSON)
                .content(corpo.formatted(prKrt, " HÉLICE — OVERHAUL ")))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.campos.nome").exists());
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
