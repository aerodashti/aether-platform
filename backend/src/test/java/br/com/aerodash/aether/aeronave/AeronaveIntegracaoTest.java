package br.com.aerodash.aether.aeronave;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import java.time.Clock;
import java.time.Instant;
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
 * A frota contra um PostgreSQL de verdade: migration, os CHECK de matrícula e base, a ordenação e a
 * situação derivada saindo pela borda HTTP.
 *
 * <p>Exige Docker. Fica fora do {@code check}: rode com {@code ./gradlew testeIntegracao}.
 */
@Tag("integracao")
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@DisplayName("Aeronaves (integração)")
class AeronaveIntegracaoTest {

  @Container @ServiceConnection
  static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

  private static final String SENHA = "aether-dev-2026";

  @Autowired private MockMvc mockMvc;
  @Autowired private AeronaveRepository aeronaves;

  @Test
  @DisplayName("o seed cria os três estados da coluna Status")
  void seedCriaOsTresEstados() {
    LocalDate hoje = LocalDate.now(Clock.systemUTC());

    assertThat(aeronaves.findByMatricula("PS-MEP"))
        .get()
        .satisfies(a -> assertThat(a.situacaoRegular(hoje, 30)).isEqualTo(SituacaoRegular.REGULAR));
    assertThat(aeronaves.findByMatricula("PT-XLB"))
        .get()
        .satisfies(a -> assertThat(a.situacaoRegular(hoje, 30)).isEqualTo(SituacaoRegular.ATENCAO));
    assertThat(aeronaves.findByMatricula("PP-JHF"))
        .get()
        .satisfies(
            a -> {
              assertThat(a.situacaoRegular(hoje, 30)).isEqualTo(SituacaoRegular.VENCIDO);
              assertThat(a.podeVoar(hoje)).isFalse();
            });
  }

  @Test
  @DisplayName("a lista sai ordenada por matrícula e traz a situação já calculada")
  void listaOrdenadaComSituacao() throws Exception {
    mockMvc
        .perform(get("/aeronaves").cookie(entrar()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].matricula").value("PP-JHF"))
        .andExpect(jsonPath("$[0].situacaoRegular").value("VENCIDO"))
        .andExpect(jsonPath("$[0].podeVoar").value(false))
        .andExpect(jsonPath("$[1].matricula").value("PR-KRT"));
  }

  @Test
  @DisplayName("sem sessão a frota responde 401")
  void semSessaoResponde401() throws Exception {
    mockMvc.perform(get("/aeronaves")).andExpect(status().isUnauthorized());
  }

  @Test
  @DisplayName("aeronave inexistente vira Problem Details 404")
  void inexistenteVira404() throws Exception {
    mockMvc
        .perform(get("/aeronaves/999999").cookie(entrar()))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.title").value("Recurso não encontrado"));
  }

  @Test
  @DisplayName("o banco recusa matrícula fora do padrão do RAB")
  void bancoRecusaMatriculaInvalida() {
    Aeronave invalida =
        new Aeronave(
            "N123AB",
            "Gulfstream G280",
            "KTEB",
            LocalDate.now(Clock.systemUTC()).plusYears(1),
            LocalDate.now(Clock.systemUTC()).plusYears(1),
            Instant.now());

    // A regra é do banco, não da entidade: é o CHECK que garante a forma mesmo para quem escrever
    // por SQL. Um `save` fora do padrão precisa falhar.
    assertThatThrownBy(() -> aeronaves.saveAndFlush(invalida)).isInstanceOf(Exception.class);
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
