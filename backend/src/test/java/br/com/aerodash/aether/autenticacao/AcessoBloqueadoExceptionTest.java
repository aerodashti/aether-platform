package br.com.aerodash.aether.autenticacao;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("AcessoBloqueadoException")
class AcessoBloqueadoExceptionTest {

  @Test
  @DisplayName("diz quantos minutos faltam, arredondando para cima")
  void dizOsMinutosQueFaltam() {
    assertThat(new AcessoBloqueadoException(Duration.ofMinutes(15)))
        .hasMessage("Tentativas demais em sequência. Tente de novo em 15 minutos.");
    assertThat(new AcessoBloqueadoException(Duration.ofSeconds(61)))
        .hasMessageEndingWith("em 2 minutos.");
    assertThat(new AcessoBloqueadoException(Duration.ofSeconds(20)))
        .hasMessageEndingWith("em 1 minuto.");
  }
}
