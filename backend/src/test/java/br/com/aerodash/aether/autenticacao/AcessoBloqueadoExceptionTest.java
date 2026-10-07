package br.com.aerodash.aether.autenticacao;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("AcessoBloqueadoException")
class AcessoBloqueadoExceptionTest {

  @Test
  @DisplayName("diz quantos minutos faltam, no singular e no plural")
  void dizOsMinutosQueFaltam() {
    assertThat(new AcessoBloqueadoException(15))
        .hasMessage("Tentativas demais em sequência. Tente de novo em 15 minutos.");
    assertThat(new AcessoBloqueadoException(1)).hasMessageEndingWith("em 1 minuto.");
    assertThat(new TrocaDeSenhaBloqueadaException(2)).hasMessageEndingWith("em 2 minutos.");
  }
}
