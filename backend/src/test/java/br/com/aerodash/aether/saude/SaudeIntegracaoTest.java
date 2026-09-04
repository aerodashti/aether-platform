package br.com.aerodash.aether.saude;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Prova que a migration do Flyway e o mapeamento JPA batem, contra um PostgreSQL de verdade.
 *
 * <p>Exige Docker. Fica fora do {@code check}: rode com {@code ./gradlew testeIntegracao}.
 */
@Tag("integracao")
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@DisplayName("Saúde (integração)")
class SaudeIntegracaoTest {

  @Container @ServiceConnection
  static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

  @Autowired private MockMvc mockMvc;

  @Autowired private SaudeRepository repository;

  @Test
  @DisplayName("a migration inicial cria a tabela e semeia api e banco")
  void migrationInicialSemeiaOsComponentes() {
    assertThat(repository.findAllByOrderByComponenteAsc())
        .extracting(RegistroDeSaude::getComponente)
        .containsExactly("api", "banco");
  }

  @Test
  @DisplayName("a verificação persiste o novo momento de cada componente provado")
  void verificacaoPersisteOMomento() throws Exception {
    mockMvc
        .perform(get("/saude"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.situacaoGeral").value("OPERANTE"))
        .andExpect(jsonPath("$.componentes.length()").value(2));

    assertThat(repository.findByComponente("banco"))
        .get()
        .satisfies(
            registro -> assertThat(registro.getSituacao()).isEqualTo(SituacaoDeSaude.OPERANTE));
  }
}
