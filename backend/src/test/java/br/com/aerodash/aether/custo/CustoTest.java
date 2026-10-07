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

  @Test
  @DisplayName("o relatório de voo vai em maiúsculas e sem espaços, para casar com o do trecho")
  void normalizaRelatorioDeVoo() {
    Custo custo =
        new Custo(
            1L,
            new DadosDoCusto(
                CategoriaDeCusto.ABASTECIMENTO,
                LocalDate.parse("2026-09-08"),
                "Jet A-1",
                "  rv-2026-041 ",
                null,
                null,
                MoedaDoCusto.BRL,
                BigDecimal.TEN,
                null),
            AGORA);

    assertThat(custo.getRelatorioDeVoo()).isEqualTo("RV-2026-041");
  }

  @Test
  @DisplayName("a data vai de 01/01/2000 até 31 dias à frente de hoje")
  void janelaDaData() {
    LocalDate hoje = LocalDate.parse("2026-10-07");

    assertThat(emData("2000-01-01").possuiDataAceitavel(hoje)).isTrue();
    assertThat(emData("2026-11-07").possuiDataAceitavel(hoje)).isTrue();
    assertThat(emData("1999-12-31").possuiDataAceitavel(hoje)).isFalse();
    assertThat(emData("2026-11-08").possuiDataAceitavel(hoje)).isFalse();
  }

  @Test
  @DisplayName("em USD, o BRL derivado precisa caber na coluna mesmo com original e câmbio nela")
  void limiteDoValorConvertido() {
    Custo noLimite =
        new Custo(
            1L,
            dados(MoedaDoCusto.USD, new BigDecimal("9999999999.99"), new BigDecimal("100")),
            AGORA);
    Custo acima =
        new Custo(
            1L,
            dados(MoedaDoCusto.USD, new BigDecimal("10000000000.00"), new BigDecimal("100")),
            AGORA);

    assertThat(noLimite.possuiValorDentroDoLimite()).isTrue();
    assertThat(acima.possuiValorDentroDoLimite()).isFalse();
  }

  @Test
  @DisplayName("sabe se a correção mantém quem paga, inclusive o rateio")
  void mantemAtribuicao() {
    Custo atribuido = new Custo(1L, dados(MoedaDoCusto.BRL, BigDecimal.ONE, null), AGORA);
    Custo rateado = emData("2026-09-01");

    assertThat(atribuido.estaAtribuidoA(7L)).isTrue();
    assertThat(atribuido.estaAtribuidoA(8L)).isFalse();
    assertThat(atribuido.estaAtribuidoA(null)).isFalse();
    assertThat(rateado.estaAtribuidoA(null)).isTrue();
  }

  private Custo emData(String data) {
    return new Custo(
        1L,
        new DadosDoCusto(
            CategoriaDeCusto.HANGARAGEM,
            LocalDate.parse(data),
            "Hangaragem",
            null,
            null,
            null,
            MoedaDoCusto.BRL,
            BigDecimal.TEN,
            null),
        AGORA);
  }
}
