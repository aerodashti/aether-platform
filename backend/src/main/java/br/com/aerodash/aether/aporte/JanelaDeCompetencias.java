package br.com.aerodash.aether.aporte;

import java.time.YearMonth;
import java.time.format.DateTimeFormatter;

/**
 * As competências que um recorte do fundo aceita — os filtros de aportes, de rendimentos e do
 * fechamento: de janeiro de 2000 até doze meses à frente da corrente. Antes disso não há o que
 * consultar; depois, é ano digitado errado. E o fechamento, que apura mês a mês desde o primeiro
 * movimento, não pode ser mandado ao ano 9999.
 */
public record JanelaDeCompetencias(YearMonth primeira, YearMonth ultima) {

  public static final YearMonth PRIMEIRA = YearMonth.of(2000, 1);

  public static final int MESES_A_FRENTE = 12;

  private static final DateTimeFormatter MES = DateTimeFormatter.ofPattern("MM/yyyy");

  public static JanelaDeCompetencias aPartirDa(YearMonth corrente) {
    return new JanelaDeCompetencias(PRIMEIRA, corrente.plusMonths(MESES_A_FRENTE));
  }

  /** Ausente é "sem limite" nos filtros que o admitem, e não fura a janela. */
  public boolean aceita(YearMonth competencia) {
    return competencia == null || !(competencia.isBefore(primeira) || competencia.isAfter(ultima));
  }

  public String recusa() {
    return "Use uma competência de " + MES.format(primeira) + " até " + MES.format(ultima) + ".";
  }
}
