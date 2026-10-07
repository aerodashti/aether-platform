package br.com.aerodash.aether.aeronave;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("ContadoresDaAeronave")
class ContadoresDaAeronaveTest {

  private static final ContadoresDaAeronave PS_MEP =
      new ContadoresDaAeronave(
          new BigDecimal("3412.5"),
          2890,
          new BigDecimal("1482300"),
          new BigDecimal("3390.2"),
          null,
          null,
          null);

  @Test
  @DisplayName("os mesmos totais em outra escala continuam sendo os mesmos")
  void mesmaEscalaNaoImporta() {
    ContadoresDaAeronave lidos =
        new ContadoresDaAeronave(
            new BigDecimal("3412.50"),
            2890,
            new BigDecimal("1482300.0"),
            new BigDecimal("3390.20"),
            null,
            null,
            null);

    assertThat(PS_MEP.possuiOsMesmosTotaisDe(lidos)).isTrue();
  }

  @Test
  @DisplayName("um voo somado depois da leitura muda os totais")
  void vooSomadoMudaOsTotais() {
    ContadoresDaAeronave depoisDoVoo =
        PS_MEP.acumular(new BigDecimal("1.5"), new BigDecimal("480"), 1);

    assertThat(depoisDoVoo.possuiOsMesmosTotaisDe(PS_MEP)).isFalse();
  }

  @Test
  @DisplayName("ter ou não ter um motor também é diferença")
  void motorPresenteOuAusente() {
    ContadoresDaAeronave semMotor1 =
        new ContadoresDaAeronave(
            new BigDecimal("3412.5"), 2890, new BigDecimal("1482300"), null, null, null, null);

    assertThat(PS_MEP.possuiOsMesmosTotaisDe(semMotor1)).isFalse();
    assertThat(semMotor1.possuiOsMesmosTotaisDe(PS_MEP)).isFalse();
  }
}
