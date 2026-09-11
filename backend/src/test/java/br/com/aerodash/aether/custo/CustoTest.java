package br.com.aerodash.aether.custo;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("Custo")
class CustoTest {

  private static final Instant AGORA = Instant.parse("2026-09-10T12:00:00Z");

  private DadosDoCusto dados(MoedaDoCusto moeda, BigDecimal valor, BigDecimal cambio) {
    return new DadosDoCusto(
        CategoriaDeCusto.ABASTECIMENTO,
        LocalDate.parse("2026-09-08"),
        " Jet A-1 — 1.850 L ",
        "RV-2026-041",
        7L,
        " NF 88.213 ",
        moeda,
        valor,
        cambio);
  }

  @Test
  @DisplayName("o tipo é consequência da categoria, nunca escolha independente")
  void tipoVemDaCategoria() {
    Custo abastecimento =
        new Custo(1L, dados(MoedaDoCusto.BRL, new BigDecimal("100"), null), AGORA);

    assertThat(abastecimento.getTipo()).isEqualTo(TipoDeCusto.VARIAVEL);
    assertThat(CategoriaDeCusto.HANGARAGEM.getTipo()).isEqualTo(TipoDeCusto.FIXO);
    assertThat(CategoriaDeCusto.HANGARAGEM.pertenceAoTipo(TipoDeCusto.VARIAVEL)).isFalse();
  }

  @Test
  @DisplayName("em BRL o valor entra direto, sem câmbio nem original")
  void brlDireto() {
    Custo custo = new Custo(1L, dados(MoedaDoCusto.BRL, new BigDecimal("15725.00"), null), AGORA);

    assertThat(custo.getValor()).isEqualByComparingTo("15725.00");
    assertThat(custo.getValorOriginal()).isNull();
    assertThat(custo.getCambio()).isNull();
    assertThat(custo.possuiCambioCoerente()).isTrue();
  }

  @Test
  @DisplayName("em USD o BRL é derivado uma vez, com duas casas, e o original fica guardado")
  void usdDerivado() {
    Custo custo =
        new Custo(
            1L,
            dados(MoedaDoCusto.USD, new BigDecimal("1200.00"), new BigDecimal("4.9223")),
            AGORA);

    assertThat(custo.getValor()).isEqualByComparingTo("5906.76");
    assertThat(custo.getValorOriginal()).isEqualByComparingTo("1200.00");
    assertThat(custo.getCambio()).isEqualByComparingTo("4.9223");
    assertThat(custo.possuiCambioCoerente()).isTrue();
  }

  @Test
  @DisplayName("normaliza descrição e nota; sem proprietário é rateado")
  void normalizaERateia() {
    Custo custo = new Custo(1L, dados(MoedaDoCusto.BRL, BigDecimal.ONE, null), AGORA);
    assertThat(custo.getDescricao()).isEqualTo("Jet A-1 — 1.850 L");
    assertThat(custo.getNotaFiscal()).isEqualTo("NF 88.213");
    assertThat(custo.ehRateado()).isFalse();

    Custo rateado =
        new Custo(
            1L,
            new DadosDoCusto(
                CategoriaDeCusto.HANGARAGEM,
                LocalDate.parse("2026-09-01"),
                "Hangaragem",
                null,
                null,
                null,
                MoedaDoCusto.BRL,
                BigDecimal.TEN,
                null),
            AGORA);
    assertThat(rateado.ehRateado()).isTrue();
  }
}
