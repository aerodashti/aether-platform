package br.com.aerodash.aether.aporte;

import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import java.time.YearMonth;

/**
 * O período que as listagens de aportes e de rendimentos dividem, conferido do mesmo jeito nas
 * duas. Cada decisão vai para o contexto com o nome da listagem na frente.
 */
final class RecorteDoFundo {

  private static final String PERIODO_INVALIDO = "Período inválido";

  private RecorteDoFundo() {}

  /** O período pedido, dentro da janela e em ordem; o lado ausente é sem limite. */
  static PeriodoDeCompetencias exigirPeriodo(
      String listagem,
      YearMonth de,
      YearMonth ate,
      YearMonth corrente,
      ContextoDaRequisicao contexto) {
    JanelaDeCompetencias janela = JanelaDeCompetencias.aPartirDa(corrente);
    exigirNaJanela(listagem, janela, de, "de", contexto);
    exigirNaJanela(listagem, janela, ate, "ate", contexto);
    PeriodoDeCompetencias periodo = PeriodoDeCompetencias.entre(de, ate);
    boolean invertido = periodo.estaInvertido();
    contexto.decisao(listagem + ".periodoInvertido", invertido);
    if (invertido) {
      throw new AporteInvalidoException(
          PERIODO_INVALIDO, "A competência inicial vem depois da final.", "de");
    }
    return periodo;
  }

  private static void exigirNaJanela(
      String listagem,
      JanelaDeCompetencias janela,
      YearMonth competencia,
      String parametro,
      ContextoDaRequisicao contexto) {
    boolean aceita = janela.aceita(competencia);
    contexto.decisao(listagem + "." + parametro + "NaJanela", aceita);
    if (!aceita) {
      throw new AporteInvalidoException(PERIODO_INVALIDO, janela.recusa(), parametro);
    }
  }
}
