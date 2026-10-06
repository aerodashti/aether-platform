package br.com.aerodash.aether.fechamento;

import java.math.BigDecimal;

/**
 * A conta de um proprietário numa competência: o que ele usou, o que lhe coube pagar, o que pôs no
 * fundo e o saldo que leva para a próxima. Saldo positivo é crédito; negativo, dívida.
 */
final class ContaDoProprietario {

  private BigDecimal percentual = BigDecimal.ZERO;
  private BigDecimal horas = BigDecimal.ZERO;
  private BigDecimal custoFixo = BigDecimal.ZERO;
  private BigDecimal custoVariavel = BigDecimal.ZERO;
  private BigDecimal aportes = BigDecimal.ZERO;
  private BigDecimal rendimentos = BigDecimal.ZERO;
  private BigDecimal saldoAnterior = BigDecimal.ZERO;

  void definirPercentual(BigDecimal valor) {
    percentual = valor;
  }

  void somarHoras(BigDecimal valor) {
    horas = horas.add(valor);
  }

  void somarCusto(boolean fixo, BigDecimal valor) {
    if (fixo) {
      custoFixo = custoFixo.add(valor);
    } else {
      custoVariavel = custoVariavel.add(valor);
    }
  }

  void somarAporte(BigDecimal valor) {
    aportes = aportes.add(valor);
  }

  void somarRendimento(BigDecimal valor) {
    rendimentos = rendimentos.add(valor);
  }

  void definirSaldoAnterior(BigDecimal valor) {
    saldoAnterior = valor;
  }

  BigDecimal totalDoMes() {
    return custoFixo.add(custoVariavel);
  }

  /** Saldo anterior + aportes + rendimentos − o que coube pagar no mês. */
  BigDecimal saldoFinal() {
    return saldoAnterior.add(aportes).add(rendimentos).subtract(totalDoMes());
  }

  /** Uma conta sem nada no mês e sem saldo não vira linha: proprietário que já saiu e quitou. */
  boolean estaVazia() {
    return percentual.signum() == 0
        && horas.signum() == 0
        && totalDoMes().signum() == 0
        && aportes.signum() == 0
        && rendimentos.signum() == 0
        && saldoAnterior.signum() == 0;
  }

  BigDecimal percentual() {
    return percentual;
  }

  BigDecimal horas() {
    return horas;
  }

  BigDecimal custoFixo() {
    return custoFixo;
  }

  BigDecimal custoVariavel() {
    return custoVariavel;
  }

  BigDecimal aportes() {
    return aportes;
  }

  BigDecimal rendimentos() {
    return rendimentos;
  }

  BigDecimal saldoAnterior() {
    return saldoAnterior;
  }
}
