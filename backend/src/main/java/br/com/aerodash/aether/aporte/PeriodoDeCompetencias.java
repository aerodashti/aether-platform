package br.com.aerodash.aether.aporte;

import java.time.LocalDate;
import java.time.YearMonth;

/**
 * O intervalo de competências de um recorte, sempre fechado. Sem limite de um lado, vale a
 * competência extrema: as consultas não precisam de um ramo para cada combinação de nulos.
 */
record PeriodoDeCompetencias(YearMonth de, YearMonth ate) {

  private static final YearMonth PRIMEIRA = YearMonth.of(1900, 1);
  private static final YearMonth ULTIMA = YearMonth.of(9999, 12);

  static PeriodoDeCompetencias entre(YearMonth de, YearMonth ate) {
    return new PeriodoDeCompetencias(de == null ? PRIMEIRA : de, ate == null ? ULTIMA : ate);
  }

  boolean estaInvertido() {
    return de.isAfter(ate);
  }

  LocalDate primeiroDia() {
    return de.atDay(1);
  }

  LocalDate ultimoDia() {
    return ate.atEndOfMonth();
  }
}
