package br.com.aerodash.aether.aeronave;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("ConfiguracaoFinanceira")
class ConfiguracaoFinanceiraTest {

  private static ConfiguracaoFinanceira com(ModeloDeAporte modelo, String valor) {
    return new ConfiguracaoFinanceira(
        BaseDoRateio.POR_USO,
        modelo,
        1,
        valor == null ? null : new BigDecimal(valor),
        5,
        BigDecimal.ZERO);
  }

  @Test
  @DisplayName("aporte fixo sem valor, ou com zero, não diz quanto cobrar")
  void aporteFixoExigeValor() {
    assertThat(com(ModeloDeAporte.FIXO, null).possuiValorDoAporteCoerente()).isFalse();
    assertThat(com(ModeloDeAporte.FIXO, "0").possuiValorDoAporteCoerente()).isFalse();
    assertThat(com(ModeloDeAporte.FIXO, "85000.00").possuiValorDoAporteCoerente()).isTrue();
  }

  @Test
  @DisplayName("o proporcional ao uso não tem valor próprio para conferir")
  void proporcionalNaoExigeValor() {
    assertThat(com(ModeloDeAporte.PROPORCIONAL_AO_USO, null).possuiValorDoAporteCoerente())
        .isTrue();
  }

  @Test
  @DisplayName("o valor que o proporcional ao uso não usa é descartado; o do fixo fica")
  void descartaValorForaDoFixo() {
    assertThat(
            com(ModeloDeAporte.PROPORCIONAL_AO_USO, "85000")
                .semValorForaDoAporteFixo()
                .valorDoAporte())
        .isNull();
    assertThat(com(ModeloDeAporte.FIXO, "85000").semValorForaDoAporteFixo().valorDoAporte())
        .isEqualByComparingTo("85000");
  }
}
