package br.com.aerodash.aether.fechamento;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Divide um valor por pesos sem perder centavo: cada um recebe o piso da sua fatia, e os centavos
 * que sobram vão para as maiores frações (empate desempata pelo menor id). A soma das partes é
 * sempre o valor — o extrato de cada proprietário fecha com o total do mês.
 */
final class Reparticao {

  private Reparticao() {}

  static Map<Long, BigDecimal> repartir(BigDecimal valor, Map<Long, BigDecimal> pesos) {
    BigDecimal somaDosPesos = pesos.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
    if (somaDosPesos.signum() <= 0) {
      return Map.of();
    }
    // Reparte o módulo e devolve o sinal no fim: o piso de um negativo puxaria para longe do zero.
    long centavos =
        valor.abs().movePointRight(2).setScale(0, RoundingMode.HALF_UP).longValueExact();
    Map<Long, Long> partes = new HashMap<>();
    Map<Long, BigDecimal> restos = new HashMap<>();
    long distribuidos = 0;
    for (Map.Entry<Long, BigDecimal> peso : pesos.entrySet()) {
      BigDecimal exata =
          BigDecimal.valueOf(centavos)
              .multiply(peso.getValue())
              .divide(somaDosPesos, 10, RoundingMode.HALF_UP);
      long piso = exata.setScale(0, RoundingMode.FLOOR).longValueExact();
      partes.put(peso.getKey(), piso);
      restos.put(peso.getKey(), exata.subtract(BigDecimal.valueOf(piso)));
      distribuidos += piso;
    }
    List<Long> porResto =
        restos.keySet().stream()
            .sorted(
                Comparator.comparing((Long id) -> restos.get(id))
                    .reversed()
                    .thenComparing(Comparator.naturalOrder()))
            .toList();
    for (int i = 0; i < centavos - distribuidos; i++) {
      Long id = porResto.get(i % porResto.size());
      partes.merge(id, 1L, Long::sum);
    }
    Map<Long, BigDecimal> resultado = new HashMap<>();
    partes.forEach(
        (id, parte) -> {
          BigDecimal emReais = BigDecimal.valueOf(parte).movePointLeft(2);
          resultado.put(id, valor.signum() < 0 ? emReais.negate() : emReais);
        });
    return resultado;
  }
}
