package br.com.aerodash.aether.aeronave;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("ContadoresDaAeronave")
class ContadoresDaAeronaveTest {

  private static final BigDecimal HORAS = new BigDecimal("1200.5");

  @Test
  @DisplayName("motores declarados em sequência a partir do 1 não deixam nenhum para trás")
  void sequenciaCompleta() {
    assertThat(comMotores(HORAS, null, null).motorSemHoras()).isEmpty();
    assertThat(comMotores(HORAS, BigDecimal.ZERO, null).motorSemHoras()).isEmpty();
    assertThat(comMotores(HORAS, HORAS, HORAS).motorSemHoras()).isEmpty();
  }

  @Test
  @DisplayName("sem motor nenhum falta o 1; o 3 sem o 2 é um buraco no 2")
  void buracoNaSequencia() {
    assertThat(comMotores(null, null, null).motorSemHoras()).hasValue(1);
    assertThat(comMotores(null, HORAS, null).motorSemHoras()).hasValue(1);
    assertThat(comMotores(HORAS, null, HORAS).motorSemHoras()).hasValue(2);
  }

  private static ContadoresDaAeronave comMotores(
      BigDecimal motor1, BigDecimal motor2, BigDecimal motor3) {
    return new ContadoresDaAeronave(
        HORAS, 950, new BigDecimal("510000"), motor1, motor2, motor3, null);
  }
}
