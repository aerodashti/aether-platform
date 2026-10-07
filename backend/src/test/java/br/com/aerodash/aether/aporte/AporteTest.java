package br.com.aerodash.aether.aporte;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneOffset;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("Aporte e Rendimento")
class AporteTest {

  private static final Instant AGORA = Instant.parse("2026-10-05T12:00:00Z");
  private static final LocalDate HOJE = LocalDate.parse("2026-10-05");

  @Test
  @DisplayName("aporte é dinheiro que já caiu: hoje vale, amanhã é previsão")
  void aporteNoFuturo() {
    Aporte deHoje =
        new Aporte(1L, 7L, HOJE, YearMonth.of(2026, 9), new BigDecimal("25000.00"), AGORA);
    Aporte deAmanha =
        new Aporte(1L, 7L, HOJE.plusDays(1), YearMonth.of(2026, 9), BigDecimal.TEN, AGORA);

    assertThat(deHoje.estaNoFuturo(HOJE)).isFalse();
    assertThat(deAmanha.estaNoFuturo(HOJE)).isTrue();
  }

  @Test
  @DisplayName("antes de 01/01/2000 é ano digitado errado, no aporte e no rendimento")
  void primeiraData() {
    Aporte de1999 =
        new Aporte(
            1L, 7L, LocalDate.parse("1999-12-31"), YearMonth.of(2026, 9), BigDecimal.TEN, AGORA);
    Aporte de2000 =
        new Aporte(
            1L, 7L, LocalDate.parse("2000-01-01"), YearMonth.of(2026, 9), BigDecimal.TEN, AGORA);
    Rendimento rendimentoDe1900 =
        new Rendimento(
            1L,
            new DadosDoRendimento(LocalDate.parse("1900-01-01"), "CDB", null, null, BigDecimal.ONE),
            AGORA);

    assertThat(de1999.estaAntesDaPrimeiraData()).isTrue();
    assertThat(de2000.estaAntesDaPrimeiraData()).isFalse();
    assertThat(rendimentoDe1900.estaAntesDaPrimeiraData()).isTrue();
  }

  @Test
  @DisplayName("a competência vai de 01/2000 até um ano depois da corrente")
  void faixaDaCompetencia() {
    YearMonth corrente = YearMonth.of(2026, 10);

    assertThat(comCompetencia(YearMonth.of(2000, 1)).possuiCompetenciaAceitavel(corrente)).isTrue();
    assertThat(comCompetencia(YearMonth.of(2027, 10)).possuiCompetenciaAceitavel(corrente))
        .isTrue();
    assertThat(comCompetencia(YearMonth.of(1999, 12)).possuiCompetenciaAceitavel(corrente))
        .isFalse();
    assertThat(comCompetencia(YearMonth.of(2027, 11)).possuiCompetenciaAceitavel(corrente))
        .isFalse();
    assertThat(comCompetencia(YearMonth.of(20266, 9)).possuiCompetenciaAceitavel(corrente))
        .isFalse();
    assertThat(comCompetencia(YearMonth.of(0, 1)).possuiCompetenciaAceitavel(corrente)).isFalse();
  }

  @Test
  @DisplayName("hoje é o de Brasília: às 22h do dia 5 o relógio em UTC já está no dia 6")
  void hojeEmBrasilia() {
    Clock relogio = Clock.fixed(Instant.parse("2026-10-06T01:00:00Z"), ZoneOffset.UTC);

    assertThat(CalendarioDoFundo.hoje(relogio)).isEqualTo(LocalDate.parse("2026-10-05"));
  }

  @Test
  @DisplayName("a competência do aporte independe da data do crédito")
  void competenciaIndependente() {
    Aporte aporte =
        new Aporte(
            1L, 7L, LocalDate.parse("2026-10-03"), YearMonth.of(2026, 9), BigDecimal.TEN, AGORA);

    assertThat(aporte.getCompetencia()).isEqualTo(YearMonth.of(2026, 9));
  }

  @Test
  @DisplayName("o rendimento entra na competência do crédito, e a aplicação chega sem espaços")
  void competenciaDoRendimento() {
    Rendimento rendimento =
        new Rendimento(
            1L,
            new DadosDoRendimento(
                LocalDate.parse("2026-09-28"), "  CDB DI ", null, null, new BigDecimal("948.22")),
            AGORA);

    assertThat(rendimento.getCompetencia()).isEqualTo(YearMonth.of(2026, 9));
    assertThat(rendimento.getAplicacao()).isEqualTo("CDB DI");
  }

  @Test
  @DisplayName("o período sem limites vira as competências extremas, e o invertido é detectado")
  void periodo() {
    PeriodoDeCompetencias aberto = PeriodoDeCompetencias.entre(null, null);
    assertThat(aberto.estaInvertido()).isFalse();
    assertThat(aberto.primeiroDia()).isBefore(LocalDate.parse("2000-01-01"));

    assertThat(
            PeriodoDeCompetencias.entre(YearMonth.of(2026, 9), YearMonth.of(2026, 1))
                .estaInvertido())
        .isTrue();
    assertThat(
            PeriodoDeCompetencias.entre(YearMonth.of(2026, 9), YearMonth.of(2026, 9)).ultimoDia())
        .isEqualTo(LocalDate.parse("2026-09-30"));
  }

  private static Aporte comCompetencia(YearMonth competencia) {
    return new Aporte(1L, 7L, HOJE, competencia, BigDecimal.TEN, AGORA);
  }
}
