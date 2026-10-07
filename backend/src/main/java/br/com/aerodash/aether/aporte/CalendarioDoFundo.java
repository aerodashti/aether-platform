package br.com.aerodash.aether.aporte;

import java.time.LocalDate;

/**
 * O calendário das entradas do fundo. O "hoje" de quem opera vem de {@code FusoDoNegocio}; aqui
 * fica a primeira data aceita.
 */
final class CalendarioDoFundo {

  /** Antes disso é ano digitado errado: o registro cairia numa competência que ninguém consulta. */
  static final LocalDate PRIMEIRA_DATA = JanelaDeCompetencias.PRIMEIRA.atDay(1);

  private CalendarioDoFundo() {}
}
