package br.com.aerodash.aether.manutencao;

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
 * A manutenção contra um PostgreSQL de verdade: o seed com os três estados de parâmetro e o ciclo
 * agendar → concluir → reabrir pela borda HTTP.
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
        .andExpect(jsonPath("$.historico[0].descricao").value("Troca de pneus e freios"));
  }

  @Test
  @DisplayName("agendar, concluir e reabrir pela borda")
  void cicloCompleto() throws Exception {
    Long prKrt = aeronaves.findByMatricula("PR-KRT").orElseThrow().getId();
    Cookie sessao = entrar();

    MvcResult criada =
        mockMvc
            .perform(
                post("/manutencoes")
                    .cookie(sessao)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {"aeronaveId":%d,"data":"2026-10-01","hora":"09:00",
                         "responsavel":"TAP M&E","descricao":"Inspeção anual","valor":52000}
                        """
                            .formatted(prKrt)))
            .andExpect(status().isCreated())
            .andReturn();
    long id = json.readTree(criada.getResponse().getContentAsString()).get("id").asLong();

    mockMvc
        .perform(post("/manutencoes/" + id + "/conclusao").cookie(sessao))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("CONCLUIDA"));
    mockMvc
        .perform(post("/manutencoes/" + id + "/reabertura").cookie(sessao))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("PROGRAMADA"));
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
