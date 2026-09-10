package br.com.aerodash.aether.tripulante;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
 * A tripulação contra um PostgreSQL de verdade: o seed com os três estados de validade e o ciclo
 * vincular/atualizar pela borda HTTP.
 *
 * <p>Exige Docker. Fica fora do {@code check}: rode com {@code ./gradlew testeIntegracao}.
 */
@Tag("integracao")
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@DisplayName("Tripulação (integração)")
class TripulanteIntegracaoTest {

  @Container @ServiceConnection
  static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

  private static final String SENHA = "aether-dev-2026";

  @Autowired private MockMvc mockMvc;
  @Autowired private AeronaveRepository aeronaves;
  @Autowired private ObjectMapper json;

  @Test
  @DisplayName("o seed julga Juliana com CHT vencido e Sérgio sem validades")
  void seedJulgaValidades() throws Exception {
    Long psMep = aeronaves.findByMatricula("PS-MEP").orElseThrow().getId();

    mockMvc
        .perform(get("/aeronaves/" + psMep + "/tripulantes").cookie(entrar()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[?(@.nome=='Juliana Prates')].chtVencido").value(true))
        .andExpect(jsonPath("$[?(@.nome=='Juliana Prates')].cmaVencido").value(false))
        .andExpect(jsonPath("$[?(@.nome=='Sérgio Tanaka')].chtVencido").value(false))
        .andExpect(jsonPath("$[?(@.nome=='Sérgio Tanaka')].situacao").value("INATIVO"));
  }

  @Test
  @DisplayName("vincular e depois atualizar, na aeronave certa")
  void vinculaEAtualiza() throws Exception {
    Long prKrt = aeronaves.findByMatricula("PR-KRT").orElseThrow().getId();
    Cookie sessao = entrar();

    MvcResult criado =
        mockMvc
            .perform(
                post("/aeronaves/" + prKrt + "/tripulantes")
                    .cookie(sessao)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {"nome":"Nova Comandante","canac":"77.88-99","funcao":"COMANDANTE",
                         "situacao":"ATIVO"}
                        """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.canac").value("778899"))
            .andReturn();
    long id = json.readTree(criado.getResponse().getContentAsString()).get("id").asLong();

    mockMvc
        .perform(atualizacaoDe(prKrt, id, sessao))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.funcao").value("INSTRUTOR"))
        .andExpect(jsonPath("$.situacao").value("INATIVO"));

    // Na aeronave errada, o mesmo id é 404: vínculo não vaza entre aeronaves.
    Long psMep = aeronaves.findByMatricula("PS-MEP").orElseThrow().getId();
    mockMvc.perform(atualizacaoDe(psMep, id, sessao)).andExpect(status().isNotFound());
  }

  private org.springframework.test.web.servlet.RequestBuilder atualizacaoDe(
      Long aeronaveId, long id, Cookie sessao) {
    return put("/aeronaves/" + aeronaveId + "/tripulantes/" + id)
        .cookie(sessao)
        .contentType(MediaType.APPLICATION_JSON)
        .content(
            """
            {"nome":"Nova Comandante","funcao":"INSTRUTOR","situacao":"INATIVO"}
            """);
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
