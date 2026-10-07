package br.com.aerodash.aether.comum.config;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

/**
 * O fuso das datas civis do negócio: o dia do voo, do crédito no fundo, da troca de horas.
 *
 * <p>Num relógio em UTC, entre 21h e meia-noite em Brasília já seria o dia seguinte, e uma data de
 * amanhã — ainda futura para quem a lança — passaria como de hoje. Por isso o relógio da aplicação
 * ({@code ConfiguracaoComum.relogio}) está neste fuso: todo {@code LocalDate.now(relogio)} é o dia
 * de Brasília, o mesmo que a tela calcula no navegador. Os instantes continuam absolutos.
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
