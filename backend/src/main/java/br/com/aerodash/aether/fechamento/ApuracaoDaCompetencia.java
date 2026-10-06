package br.com.aerodash.aether.fechamento;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.Map;

/**
 * O fechamento de uma competência: os totais da aeronave, a conta de cada proprietário e o saldo do
 * fundo no início e no fim do mês.
 *
 * @param horas todas as horas voadas, inclusive as de manutenção
 * @param naoRateado custos que não tinham contrato para ratear: pesam no fundo, em conta nenhuma
 */
record ApuracaoDaCompetencia(
    YearMonth competencia,
    BigDecimal horas,
    BigDecimal custosFixos,
    BigDecimal custosVariaveis,
    BigDecimal aportes,
    BigDecimal rendimentos,
    BigDecimal naoRateado,
    BigDecimal saldoInicialDoFundo,
    Map<Long, ContaDoProprietario> contas,
    Map<CriterioDeRateio, Integer> criterios) {

  BigDecimal totalDeCustos() {
    return custosFixos.add(custosVariaveis);
  }

  /** O que entrou menos o que saiu no mês. */
  BigDecimal resultado() {
    return aportes.add(rendimentos).subtract(totalDeCustos());
  }

  BigDecimal saldoFinalDoFundo() {
    return saldoInicialDoFundo.add(resultado());
  }
}
