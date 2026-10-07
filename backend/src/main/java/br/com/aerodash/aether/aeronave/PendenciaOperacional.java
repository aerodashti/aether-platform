package br.com.aerodash.aether.aeronave;

/**
 * Algo fora dos documentos que pesa na situação da aeronave: um limite de manutenção estourado, uma
 * manutenção programada atrasada, um tripulante com CMA vencido. A {@code situacao} é o quanto pesa
 * — {@code VENCIDO} impede o voo, {@code ATENCAO} só avisa — e a {@code descricao} é o que a tela
 * diz, porque "Atenção" sozinho não informa.
 */
public record PendenciaOperacional(String descricao, SituacaoRegular situacao) {

  /** Impede o voo: limite estourado, manutenção atrasada. */
  public static PendenciaOperacional impeditiva(String descricao) {
    return new PendenciaOperacional(descricao, SituacaoRegular.VENCIDO);
  }

  /** Tira do regular sem impedir o voo: perto do limite, tripulante sem habilitação em dia. */
  public static PendenciaOperacional deAtencao(String descricao) {
    return new PendenciaOperacional(descricao, SituacaoRegular.ATENCAO);
  }

  public boolean impedeVoo() {
    return situacao == SituacaoRegular.VENCIDO;
  }
}
