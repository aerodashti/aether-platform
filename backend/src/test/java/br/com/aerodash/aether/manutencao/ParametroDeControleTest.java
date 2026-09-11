package br.com.aerodash.aether.manutencao;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("ParametroDeControle")
class ParametroDeControleTest {

  private static final Instant AGORA = Instant.parse("2026-09-10T12:00:00Z");
  private static final LocalDate HOJE = LocalDate.parse("2026-09-10");

  private ParametroDeControle deHoras(String limite, String aviso) {
    return new ParametroDeControle(
        1L,
        new DadosDoParametro(
            "Inspeção de célula",
            TipoDeParametro.HORAS,
            new BigDecimal(limite),
            null,
            new BigDecimal(aviso)),
        AGORA);
  }

  @Test
  @DisplayName("horas: regular longe do limite, atenção dentro do aviso, estourado depois dele")
  void julgaHoras() {
    ParametroDeControle parametro = deHoras("4000.0", "100.0");

    assertThat(parametro.situacao(new BigDecimal("3412.5"), HOJE))
        .isEqualTo(SituacaoDoParametro.REGULAR);
    assertThat(parametro.restante(new BigDecimal("3412.5"), HOJE)).isEqualByComparingTo("587.5");
    assertThat(parametro.situacao(new BigDecimal("3950.0"), HOJE))
        .isEqualTo(SituacaoDoParametro.ATENCAO);
    assertThat(parametro.situacao(new BigDecimal("4000.1"), HOJE))
        .isEqualTo(SituacaoDoParametro.ESTOURADO);
  }

  @Test
  @DisplayName("data: o restante é em dias, negativo quando ficou para trás")
  void julgaData() {
    ParametroDeControle pesagem =
        new ParametroDeControle(
            1L,
            new DadosDoParametro(
                "Pesagem",
                TipoDeParametro.DATA,
                null,
                LocalDate.parse("2026-08-21"),
                new BigDecimal("30")),
            AGORA);

    assertThat(pesagem.restante(BigDecimal.ZERO, HOJE)).isEqualByComparingTo("-20");
    assertThat(pesagem.situacao(BigDecimal.ZERO, HOJE)).isEqualTo(SituacaoDoParametro.ESTOURADO);
  }

  @Test
  @DisplayName("exatamente no limite ainda é atenção, não estouro — igual aos vencimentos")
  void noLimiteEhAtencao() {
    assertThat(deHoras("4000.0", "100.0").situacao(new BigDecimal("4000.0"), HOJE))
        .isEqualTo(SituacaoDoParametro.ATENCAO);
  }

  @Test
  @DisplayName("o tipo decide qual limite vale: DATA zera o numérico e vice-versa")
  void limitePorTipo() {
    ParametroDeControle deData =
        new ParametroDeControle(
            1L,
            new DadosDoParametro(
                "Pesagem",
                TipoDeParametro.DATA,
                new BigDecimal("999"),
                LocalDate.parse("2027-01-01"),
                BigDecimal.ONE),
            AGORA);

    assertThat(deData.getLimite()).isNull();
    assertThat(deData.getDataLimite()).isEqualTo(LocalDate.parse("2027-01-01"));
    assertThat(deData.possuiLimiteCoerente()).isTrue();
    assertThat(deHoras("4000.0", "1").getDataLimite()).isNull();
  }
}
