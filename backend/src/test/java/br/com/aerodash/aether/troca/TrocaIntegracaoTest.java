package br.com.aerodash.aether.troca;

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
 * As trocas contra um PostgreSQL de verdade: o seed com as duas abas, o saldo de horas de um
 * proprietário e o ciclo registrar → concluir → reabrir pela borda HTTP.
 *
 * <p>Exige Docker. Fica fora do {@code check}: rode com {@code ./gradlew testeIntegracao}.
 */
@Tag("integracao")
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@DisplayName("Trocas de KM (integração)")
class TrocaIntegracaoTest {

  @Container @ServiceConnection
  static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

  private static final String SENHA = "aether-dev-2026";

  @Autowired private MockMvc mockMvc;
  @Autowired private AeronaveRepository aeronaves;
  @Autowired private ProprietarioRepository proprietarios;
  @Autowired private ObjectMapper json;
  @Autowired private Clock relogio;

  private Long idDe(String nome) {
    return proprietarios.findAll().stream()
        .filter(dono -> dono.getNome().equals(nome))
        .findFirst()
        .orElseThrow()
        .getId();
  }

  @Test
  @DisplayName("o seed: duas pendentes e uma concluída; Ricardo cedeu 2,5 e recebeu 1,2")
  void seed() throws Exception {
    Cookie sessao = entrar();
    mockMvc
        .perform(get("/trocas").cookie(sessao))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.pendentes").value(2))
        .andExpect(jsonPath("$.concluidas").value(1))
        .andExpect(jsonPath("$.saldo").doesNotExist());
    // A concluída é entre Vetor e Helena: no recorte do Ricardo, não aparece.
    mockMvc
        .perform(get("/trocas?proprietario=" + idDe("Ricardo Meirelles")).cookie(sessao))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.pendentes").value(2))
        .andExpect(jsonPath("$.concluidas").value(0))
        .andExpect(jsonPath("$.saldo.horasADevolver").value(-1.3))
        .andExpect(jsonPath("$.trocas[?(@.horas==2.5)].valorTotal").value(37000.00));
  }

  @Test
  @DisplayName("registrar, concluir e reabrir")
  void ciclo() throws Exception {
    Long psMep = aeronaves.findByMatricula("PS-MEP").orElseThrow().getId();
    Cookie sessao = entrar();

    MvcResult criada =
        mockMvc
            .perform(
                post("/trocas")
                    .cookie(sessao)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {"aeronaveId":%d,"data":"%s","cedenteId":%d,"recebedorId":%d,"horas":1.5}
                        """
                            .formatted(
                                psMep,
                                LocalDate.now(relogio),
                                idDe("Helena Sarraf"),
                                idDe("Vetor Participações"))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.situacao").value("PENDENTE"))
            .andReturn();
    long id = json.readTree(criada.getResponse().getContentAsString()).get("id").asLong();

    mockMvc
        .perform(post("/trocas/%d/conclusao".formatted(id)).cookie(sessao))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.situacao").value("CONCLUIDA"))
        .andExpect(jsonPath("$.concluidaEm").value(LocalDate.now(relogio).toString()));
    mockMvc
        .perform(post("/trocas/%d/reabertura".formatted(id)).cookie(sessao))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.concluidaEm").doesNotExist());
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
