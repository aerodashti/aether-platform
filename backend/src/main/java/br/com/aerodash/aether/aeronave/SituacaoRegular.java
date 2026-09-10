package br.com.aerodash.aether.aeronave;

/**
 * Estado de conformidade regulatória da aeronave num instante.
 *
 * <p>Não é coluna do banco: é derivado dos vencimentos toda vez que alguém pergunta. Gravar o
 * estado exigiria uma rotina para envelhecê-lo, e uma aeronave que ficou "regular" na tabela porque
 * o job não rodou é pior que nenhuma informação.
 */
public enum SituacaoRegular {

  /** Nenhum documento perto de vencer. */
  REGULAR,

  /** Algum documento vence dentro da janela de atenção. Ainda pode voar. */
  ATENCAO,

  /** Algum documento já venceu. A aeronave não pode voar. */
  VENCIDO
}
