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
  private static final String ESPACO_NAO_SEPARAVEL = Character.toString(0x00A0);

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

  private ParametroDeControle de(TipoDeParametro tipo, String limite, String aviso) {
    return new ParametroDeControle(
        1L,
        new DadosDoParametro(
            "Parâmetro",
            tipo,
            limite == null ? null : new BigDecimal(limite),
            tipo == TipoDeParametro.DATA ? HOJE.plusYears(1) : null,
            new BigDecimal(aviso)),
        AGORA);
  }

  private ParametroDeControle comDataLimite(LocalDate dataLimite) {
    return new ParametroDeControle(
        1L,
        new DadosDoParametro("Pesagem", TipoDeParametro.DATA, null, dataLimite, BigDecimal.TEN),
        AGORA);
  }

  @Test
  @DisplayName("ciclos se contam inteiros; horas aceitam décimos")
  void limiteNaEscalaDaRegua() {
    assertThat(de(TipoDeParametro.CICLOS, "3000.5", "200").possuiLimiteNaEscalaDaRegua()).isFalse();
    assertThat(de(TipoDeParametro.CICLOS, "3000.0", "200").possuiLimiteNaEscalaDaRegua()).isTrue();
    assertThat(de(TipoDeParametro.HORAS, "4000.5", "100").possuiLimiteNaEscalaDaRegua()).isTrue();
  }

  @Test
  @DisplayName("a faixa de aviso é inteira em ciclos e em dias")
  void avisoNaEscalaDaRegua() {
    assertThat(de(TipoDeParametro.CICLOS, "3000", "0.5").possuiAvisoNaEscalaDaRegua()).isFalse();
    assertThat(de(TipoDeParametro.DATA, null, "30.5").possuiAvisoNaEscalaDaRegua()).isFalse();
    assertThat(de(TipoDeParametro.DATA, null, "30.0").possuiAvisoNaEscalaDaRegua()).isTrue();
    assertThat(de(TipoDeParametro.HORAS, "4000", "0.5").possuiAvisoNaEscalaDaRegua()).isTrue();
  }

  @Test
  @DisplayName("o aviso vem antes do limite; na régua de data não há o que comparar")
  void avisoAntesDoLimite() {
    assertThat(de(TipoDeParametro.HORAS, "100", "5000").possuiAvisoAntesDoLimite()).isFalse();
    assertThat(de(TipoDeParametro.CICLOS, "200", "200").possuiAvisoAntesDoLimite()).isFalse();
    assertThat(de(TipoDeParametro.HORAS, "1000", "100").possuiAvisoAntesDoLimite()).isTrue();
    assertThat(de(TipoDeParametro.DATA, null, "5000").possuiAvisoAntesDoLimite()).isTrue();
  }

  @Test
  @DisplayName("data limite de 2000 a dez anos à frente; vencida dentro disso é aceita")
  void dataLimitePlausivel() {
    assertThat(comDataLimite(LocalDate.of(1, 1, 1)).possuiDataLimitePlausivel(HOJE)).isFalse();
    assertThat(comDataLimite(LocalDate.parse("1999-12-31")).possuiDataLimitePlausivel(HOJE))
        .isFalse();
    assertThat(comDataLimite(LocalDate.parse("2000-01-01")).possuiDataLimitePlausivel(HOJE))
        .isTrue();
    assertThat(comDataLimite(HOJE.plusYears(10)).possuiDataLimitePlausivel(HOJE)).isTrue();
    assertThat(comDataLimite(HOJE.plusYears(10).plusDays(1)).possuiDataLimitePlausivel(HOJE))
        .isFalse();
  }

  @Test
  @DisplayName("o nome perde o espaço não separável das pontas")
  void nomeAparado() {
    ParametroDeControle parametro =
        new ParametroDeControle(
            1L,
            new DadosDoParametro(
                ESPACO_NAO_SEPARAVEL + "Pesagem" + ESPACO_NAO_SEPARAVEL,
                TipoDeParametro.DATA,
                null,
                HOJE.plusYears(1),
                BigDecimal.TEN),
            AGORA);

    assertThat(parametro.getNome()).isEqualTo("Pesagem");
  }
}
