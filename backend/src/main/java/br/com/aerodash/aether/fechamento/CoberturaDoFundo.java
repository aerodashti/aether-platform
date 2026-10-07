package br.com.aerodash.aether.fechamento;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Optional;

/**
 * Quantos meses o fundo paga sem aporte novo: o saldo dividido pela média do custo das competências
 * anteriores. É o "Cobertura" da Visão geral — a pergunta do proprietário antes do extrato: quando
 * vou precisar pôr dinheiro?
 *
 * <p>A média é das últimas {@value #MESES_DA_MEDIA} competências antes da que se olha (a corrente
 * ainda está aberta e subestimaria o custo). Sem custo nenhum nesse período não há média, e a
 * cobertura é indefinida, não infinita. Saldo zero ou negativo é cobertura zero: o fundo já está
 * descoberto.
 */
final class CoberturaDoFundo {

  static final int MESES_DA_MEDIA = 3;

  private CoberturaDoFundo() {}

  /** Em meses, com uma casa; vazia quando não houve custo para medir. */
  static Optional<BigDecimal> emMeses(BigDecimal saldo, List<BigDecimal> custosAnteriores) {
    List<BigDecimal> janela =
        custosAnteriores.subList(
            Math.max(0, custosAnteriores.size() - MESES_DA_MEDIA), custosAnteriores.size());
    BigDecimal total = janela.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
    if (total.signum() <= 0) {
      return Optional.empty();
    }
    if (saldo.signum() <= 0) {
      return Optional.of(BigDecimal.ZERO.setScale(1));
    }
    BigDecimal media = total.divide(BigDecimal.valueOf(janela.size()), 10, RoundingMode.HALF_UP);
    return Optional.of(saldo.divide(media, 1, RoundingMode.HALF_DOWN));
  }
}
