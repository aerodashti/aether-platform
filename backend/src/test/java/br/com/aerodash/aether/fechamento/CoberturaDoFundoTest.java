package br.com.aerodash.aether.fechamento;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("Cobertura do fundo")
class CoberturaDoFundoTest {

  private static BigDecimal r(String valor) {
    return new BigDecimal(valor);
  }

  @Test
  @DisplayName("é o saldo sobre a média das três últimas competências")
  void mediaDasTresUltimas() {
    // A primeira competência fica fora da janela: só as três últimas contam.
    List<BigDecimal> custos = List.of(r("999999"), r("20000"), r("30000"), r("40000"));

    assertThat(CoberturaDoFundo.emMeses(r("75000"), custos))
        .hasValueSatisfying(meses -> assertThat(meses).isEqualByComparingTo("2.5"));
  }

  @Test
  @DisplayName("com menos de três competências, a média é das que existem")
  void historicoCurto() {
    assertThat(CoberturaDoFundo.emMeses(r("30000"), List.of(r("10000"))))
        .hasValueSatisfying(meses -> assertThat(meses).isEqualByComparingTo("3.0"));
  }

  @Test
  @DisplayName("saldo devedor é cobertura zero; sem custo, indefinida")
  void bordas() {
    assertThat(CoberturaDoFundo.emMeses(r("-500"), List.of(r("1000"))))
        .hasValueSatisfying(meses -> assertThat(meses).isEqualByComparingTo("0"));
    assertThat(CoberturaDoFundo.emMeses(r("5000"), List.of())).isEmpty();
    assertThat(CoberturaDoFundo.emMeses(r("5000"), List.of(r("0"), r("0")))).isEmpty();
  }
}
