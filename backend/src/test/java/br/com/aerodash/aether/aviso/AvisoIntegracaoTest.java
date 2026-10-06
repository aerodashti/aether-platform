package br.com.aerodash.aether.aviso;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
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
 * A Central contra o seed num PostgreSQL de verdade: o seed tem aeronave com documento vencido e
 * tripulante com CHT vencido, e a leitura é de cada usuário — marcar e desmarcar move o contador.
 *
 * <p>Exige Docker. Fica fora do {@code check}: rode com {@code ./gradlew testeIntegracao}.
 */
@Tag("integracao")
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@DisplayName("Avisos (integração)")
class AvisoIntegracaoTest {

  @Container @ServiceConnection
  static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper json;

  @Test
  @DisplayName("o seed gera avisos vencidos, e marcar como lido baixa o contador de não lidos")
  void leitura() throws Exception {
    Cookie sessao = entrar();
    JsonNode antes = ler(sessao);
    long naoLidos = antes.at("/indicadores/naoLidos").asLong();
    assertThat(antes.at("/indicadores/vencidos").asLong()).isPositive();
    assertThat(antes.get("avisos").get(0).get("gravidade").asText()).isEqualTo("VENCIDO");
    String chave = antes.get("avisos").get(0).get("chave").asText();

    mockMvc
        .perform(
            put("/avisos/leitura")
                .cookie(sessao)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"chaves\":[\"%s\"],\"lido\":true}".formatted(chave)))
        .andExpect(status().isNoContent());
    assertThat(ler(sessao).at("/indicadores/naoLidos").asLong()).isEqualTo(naoLidos - 1);

    mockMvc
        .perform(
            put("/avisos/leitura")
                .cookie(sessao)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"chaves\":[\"%s\"],\"lido\":false}".formatted(chave)))
        .andExpect(status().isNoContent());
    assertThat(ler(sessao).at("/indicadores/naoLidos").asLong()).isEqualTo(naoLidos);
  }

  private JsonNode ler(Cookie sessao) throws Exception {
    MvcResult resultado =
        mockMvc.perform(get("/avisos").cookie(sessao)).andExpect(status().isOk()).andReturn();
    return json.readTree(resultado.getResponse().getContentAsString());
  }

  private Cookie entrar() throws Exception {
    MvcResult resultado =
        mockMvc
            .perform(
                post("/autenticacao/entrar")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {"email":"leonardo@administraair.com.br","senha":"aether-dev-2026"}
                        """))
            .andExpect(status().isOk())
            .andReturn();
    return resultado.getResponse().getCookie("aether_sessao");
  }
}
