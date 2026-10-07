package br.com.aerodash.aether.comum.config;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

/**
 * O fuso das datas civis do negócio: o dia do voo, do crédito no fundo, da troca de horas.
 *
 * <p>O relógio da aplicação é UTC. Entre 21h e meia-noite em Brasília ele já está no dia seguinte,
 * e uma data de amanhã — ainda futura para quem a lança — passaria como de hoje. Por isso "hoje" é
 * o do horário de Brasília, o mesmo que a tela calcula no navegador.
 */
public final class FusoDoNegocio {

  public static final ZoneId ZONA = ZoneId.of("America/Sao_Paulo");

  private FusoDoNegocio() {}

  /** Hoje, no fuso do negócio, pelo relógio da aplicação. */
  public static LocalDate hoje(Clock relogio) {
    return dataDe(relogio.instant());
  }

  /** O dia civil de um instante, no fuso do negócio. */
  public static LocalDate dataDe(Instant instante) {
    return LocalDate.ofInstant(instante, ZONA);
  }
}
