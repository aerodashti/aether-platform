package br.com.aerodash.aether.fechamento;

import static org.assertj.core.api.Assertions.assertThat;

import br.com.aerodash.aether.aeronave.BaseDoRateio;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("CalculadoraDoFechamento")
class CalculadoraDoFechamentoTest {

  private static final long RICARDO = 1L;
  private static final long VETOR = 2L;
  private static final long HELENA = 3L;
  private static final YearMonth SETEMBRO = YearMonth.of(2026, 9);

  /** 60/40 desde sempre. */
  private static final List<QuadroDeParticipacao> SESSENTA_QUARENTA =
      List.of(
          new QuadroDeParticipacao(
              Instant.parse("2025-01-01T00:00:00Z"),
              null,
              Map.of(RICARDO, new BigDecimal("60.00"), VETOR, new BigDecimal("40.00"))));

  private static BigDecimal r(String valor) {
    return new BigDecimal(valor);
  }

  private static LocalDate dia(int dia) {
    return SETEMBRO.atDay(dia);
  }

  private static MovimentosDaAeronave movimentos(
      BaseDoRateio base,
      List<MovimentosDaAeronave.Custo> custos,
      List<MovimentosDaAeronave.Horas> horas) {
    return new MovimentosDaAeronave(
        base, BigDecimal.ZERO, SESSENTA_QUARENTA, custos, horas, List.of(), List.of());
  }

  private static ApuracaoDaCompetencia setembro(MovimentosDaAeronave movimentos) {
    List<ApuracaoDaCompetencia> todas = new CalculadoraDoFechamento(movimentos).apurarAte(SETEMBRO);
    return todas.get(todas.size() - 1);
  }

  @Test
  @DisplayName("fixo rateado vai pelo % de propriedade")
  void fixoPorPropriedade() {
    ApuracaoDaCompetencia apuracao =
        setembro(
            movimentos(
                BaseDoRateio.POR_USO,
                List.of(new MovimentosDaAeronave.Custo(dia(5), true, null, null, r("10000.00"))),
                List.of()));

    assertThat(apuracao.contas().get(RICARDO).custoFixo()).isEqualByComparingTo("6000.00");
    assertThat(apuracao.contas().get(VETOR).custoFixo()).isEqualByComparingTo("4000.00");
    assertThat(apuracao.criterios()).containsEntry(CriterioDeRateio.PROPRIEDADE, 1);
  }

  @Test
  @DisplayName("variável com Rel. Voo vai para quem voou aquele voo; manutenção não é uso")
  void variavelPeloVoo() {
    ApuracaoDaCompetencia apuracao =
        setembro(
            movimentos(
                BaseDoRateio.POR_USO,
                List.of(
                    new MovimentosDaAeronave.Custo(dia(8), false, null, "RV-041", r("9000.00"))),
                List.of(
                    new MovimentosDaAeronave.Horas(dia(8), "RV-041", VETOR, r("2.0")),
                    new MovimentosDaAeronave.Horas(dia(8), "RV-041", null, r("1.0")),
                    new MovimentosDaAeronave.Horas(dia(9), "RV-042", RICARDO, r("5.0")))));

    assertThat(apuracao.contas().get(VETOR).custoVariavel()).isEqualByComparingTo("9000.00");
    assertThat(apuracao.contas().get(RICARDO).custoVariavel()).isEqualByComparingTo("0");
    assertThat(apuracao.horas()).isEqualByComparingTo("8.0");
  }

  @Test
  @DisplayName("variável sem voo, base por uso: pelas horas do mês")
  void variavelPeloUso() {
    ApuracaoDaCompetencia apuracao =
        setembro(
            movimentos(
                BaseDoRateio.POR_USO,
                List.of(new MovimentosDaAeronave.Custo(dia(20), false, null, null, r("1000.00"))),
                List.of(
                    new MovimentosDaAeronave.Horas(dia(2), "RV-1", RICARDO, r("1.0")),
                    new MovimentosDaAeronave.Horas(dia(3), "RV-2", VETOR, r("3.0")))));

    assertThat(apuracao.contas().get(RICARDO).custoVariavel()).isEqualByComparingTo("250.00");
    assertThat(apuracao.contas().get(VETOR).custoVariavel()).isEqualByComparingTo("750.00");
  }

  @Test
  @DisplayName("variável sem voo, base por propriedade: pelo %")
  void variavelPorPropriedade() {
    ApuracaoDaCompetencia apuracao =
        setembro(
            movimentos(
                BaseDoRateio.POR_PROPRIEDADE,
                List.of(new MovimentosDaAeronave.Custo(dia(20), false, null, null, r("1000.00"))),
                List.of(new MovimentosDaAeronave.Horas(dia(2), "RV-1", VETOR, r("3.0")))));

    assertThat(apuracao.contas().get(RICARDO).custoVariavel()).isEqualByComparingTo("600.00");
  }

  @Test
  @DisplayName("custo atribuído vai inteiro para o proprietário")
  void direto() {
    ApuracaoDaCompetencia apuracao =
        setembro(
            movimentos(
                BaseDoRateio.POR_USO,
                List.of(new MovimentosDaAeronave.Custo(dia(5), false, VETOR, null, r("777.77"))),
                List.of()));

    assertThat(apuracao.contas().get(VETOR).custoVariavel()).isEqualByComparingTo("777.77");
    assertThat(apuracao.contas()).doesNotContainKey(HELENA);
  }

  @Test
  @DisplayName("o rateio não perde centavo: 100,00 em três terços fecha em 100,00")
  void centavos() {
    Map<Long, BigDecimal> partes =
        Reparticao.repartir(
            r("100.00"),
            Map.of(RICARDO, BigDecimal.ONE, VETOR, BigDecimal.ONE, HELENA, BigDecimal.ONE));

    assertThat(partes.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add))
        .isEqualByComparingTo("100.00");
    assertThat(partes.get(RICARDO)).isEqualByComparingTo("33.34");
    assertThat(Reparticao.repartir(r("-10.00"), Map.of(RICARDO, r("60"), VETOR, r("40"))))
        .containsEntry(RICARDO, r("-6.00"));
  }

  @Test
  @DisplayName("o saldo acumula desde a abertura: anterior + aportes + rendimentos − custos")
  void saldoAcumulado() {
    MovimentosDaAeronave movimentos =
        new MovimentosDaAeronave(
            BaseDoRateio.POR_USO,
            r("-1000.00"),
            SESSENTA_QUARENTA,
            List.of(
                new MovimentosDaAeronave.Custo(
                    LocalDate.parse("2026-08-10"), true, null, null, r("5000.00")),
                new MovimentosDaAeronave.Custo(dia(10), true, null, null, r("5000.00"))),
            List.of(),
            List.of(
                new MovimentosDaAeronave.Aporte(YearMonth.of(2026, 8), RICARDO, r("3000.00")),
                new MovimentosDaAeronave.Aporte(SETEMBRO, RICARDO, r("3000.00"))),
            List.of(new MovimentosDaAeronave.Rendimento(dia(28), r("100.00"))));

    List<ApuracaoDaCompetencia> todas = new CalculadoraDoFechamento(movimentos).apurarAte(SETEMBRO);

    assertThat(todas)
        .extracting(ApuracaoDaCompetencia::competencia)
        .containsExactly(YearMonth.of(2026, 8), SETEMBRO);
    ContaDoProprietario ricardo = todas.get(1).contas().get(RICARDO);
    // Abertura −600; agosto −600 + 3000 − 3000 = −600; setembro −600 + 3000 + 60 − 3000 = −540.
    assertThat(ricardo.saldoAnterior()).isEqualByComparingTo("-600.00");
    assertThat(ricardo.saldoFinal()).isEqualByComparingTo("-540.00");
    // O fundo: −1000 + 6000 + 100 − 10000.
    assertThat(todas.get(1).saldoFinalDoFundo()).isEqualByComparingTo("-4900.00");
  }

  @Test
  @DisplayName("o contrato que vale é o vigente na data do custo")
  void contratoNaData() {
    List<QuadroDeParticipacao> troca =
        List.of(
            new QuadroDeParticipacao(
                Instant.parse("2025-01-01T00:00:00Z"),
                Instant.parse("2026-09-15T12:00:00Z"),
                Map.of(RICARDO, r("100.00"))),
            new QuadroDeParticipacao(
                Instant.parse("2026-09-15T12:00:00Z"),
                null,
                Map.of(RICARDO, r("50.00"), HELENA, r("50.00"))));
    MovimentosDaAeronave movimentos =
        new MovimentosDaAeronave(
            BaseDoRateio.POR_USO,
            BigDecimal.ZERO,
            troca,
            List.of(
                new MovimentosDaAeronave.Custo(dia(10), true, null, null, r("1000.00")),
                new MovimentosDaAeronave.Custo(dia(20), true, null, null, r("1000.00"))),
            List.of(),
            List.of(),
            List.of());

    ApuracaoDaCompetencia apuracao = setembro(movimentos);

    assertThat(apuracao.contas().get(RICARDO).custoFixo()).isEqualByComparingTo("1500.00");
    assertThat(apuracao.contas().get(HELENA).custoFixo()).isEqualByComparingTo("500.00");
    assertThat(apuracao.contas().get(HELENA).percentual()).isEqualByComparingTo("50.00");
  }

  @Test
  @DisplayName("sem contrato, o custo pesa no fundo mas em conta nenhuma")
  void semContrato() {
    MovimentosDaAeronave movimentos =
        new MovimentosDaAeronave(
            BaseDoRateio.POR_USO,
            BigDecimal.ZERO,
            List.of(),
            List.of(new MovimentosDaAeronave.Custo(dia(10), true, null, null, r("1000.00"))),
            List.of(),
            List.of(),
            List.of());

    ApuracaoDaCompetencia apuracao = setembro(movimentos);

    assertThat(apuracao.naoRateado()).isEqualByComparingTo("1000.00");
    assertThat(apuracao.contas()).isEmpty();
    assertThat(apuracao.saldoFinalDoFundo()).isEqualByComparingTo("-1000.00");
  }
}
