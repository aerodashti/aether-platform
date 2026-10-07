package br.com.aerodash.aether.aporte;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;

/**
 * O calendário das entradas do fundo: o "hoje" de quem opera e a primeira data aceita.
 *
 * <p>O relógio da aplicação é UTC. Entre 21h e meia-noite em Brasília ele já está no dia seguinte,
 * e um crédito com a data de amanhã — ainda futuro para quem o lança — passaria como de hoje. Por
 * isso "hoje" é o do horário de Brasília, o mesmo que a tela calcula no navegador.
 */
final class CalendarioDoFundo {

  static final ZoneId FUSO_DA_OPERACAO = ZoneId.of("America/Sao_Paulo");

  /** Antes disso é ano digitado errado: o registro cairia numa competência que ninguém consulta. */
  static final LocalDate PRIMEIRA_DATA = LocalDate.of(2000, 1, 1);

  private CalendarioDoFundo() {}

  static LocalDate hoje(Clock relogio) {
    return LocalDate.ofInstant(relogio.instant(), FUSO_DA_OPERACAO);
  }
}
