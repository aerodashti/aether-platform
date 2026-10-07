package br.com.aerodash.aether.aeronave;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("ConfiguracaoFinanceira")
class ConfiguracaoFinanceiraTest {

  @Test
  @DisplayName("o aporte fixo exige o valor de cada aporte, maior que zero")
  void aporteFixoExigeValor() {
    assertThat(com(ModeloDeAporte.FIXO, new BigDecimal("45000")).possuiValorDoAporteCoerente())
        .isTrue();
    assertThat(com(ModeloDeAporte.FIXO, null).possuiValorDoAporteCoerente()).isFalse();
    assertThat(com(ModeloDeAporte.FIXO, BigDecimal.ZERO).possuiValorDoAporteCoerente()).isFalse();
  }

  @Test
  @DisplayName("no proporcional ao uso o valor é ignorado: não há valor combinado")
  void proporcionalIgnoraOValor() {
    ConfiguracaoFinanceira proporcional =
        com(ModeloDeAporte.PROPORCIONAL_AO_USO, new BigDecimal("45000"));

    assertThat(proporcional.valorDoAporte()).isNull();
    assertThat(proporcional.possuiValorDoAporteCoerente()).isTrue();
  }

  private static ConfiguracaoFinanceira com(ModeloDeAporte modelo, BigDecimal valor) {
    return new ConfiguracaoFinanceira(BaseDoRateio.POR_USO, modelo, 1, valor, 5, BigDecimal.ZERO);
  }
}
