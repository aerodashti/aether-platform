package br.com.aerodash.aether.voo;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;

/**
 * Partida e pouso de um mesmo par — o previsto ou o realizado do trecho. As regras de coerência são
 * as mesmas para os dois e só se aplicam ao que foi informado: o par pela metade é assunto de quem
 * o usa (o realizado precisa vir inteiro; o previsto, não).
 */
public record ParDeHorarios(Instant partida, Instant pouso) {

  /** O teto de um trecho (decisão de produto D6): acima disso é data errada, não um voo. */
  private static final Duration DURACAO_MAXIMA = Duration.ofHours(24);

  /**
   * Quanto a partida pode se afastar da data do trecho (decisão D18). A data é a do fuso de quem
   * lançou e o instante está em UTC; um dia de folga cobre o fuso e o voo que sai depois da
   * meia-noite.
   */
  private static final long DIAS_DE_FOLGA = 1;

  public boolean estaCompleto() {
    return partida != null && pouso != null;
  }

  public boolean possuiPousoSemPartida() {
    return partida == null && pouso != null;
  }

  public boolean possuiPartidaSemPouso() {
    return partida != null && pouso == null;
  }

  /** Na mesma hora não é voo de 24 h: é erro de digitação. */
  public boolean possuiPousoDepoisDaPartida() {
    return !estaCompleto() || pouso.isAfter(partida);
  }

  public boolean possuiDuracaoPlausivel() {
    return !estaCompleto() || Duration.between(partida, pouso).compareTo(DURACAO_MAXIMA) <= 0;
  }

  public boolean possuiPartidaPertoDe(LocalDate data) {
    if (partida == null) {
      return true;
    }
    long dias = ChronoUnit.DAYS.between(data, partida.atOffset(ZoneOffset.UTC).toLocalDate());
    return Math.abs(dias) <= DIAS_DE_FOLGA;
  }

  /** A duração em horas, com uma casa; nula sem o par completo. */
  public BigDecimal horas() {
    if (!estaCompleto()) {
      return null;
    }
    return BigDecimal.valueOf(Duration.between(partida, pouso).toMinutes())
        .divide(BigDecimal.valueOf(60), 1, RoundingMode.HALF_UP);
  }
}
