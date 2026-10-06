package br.com.aerodash.aether.troca;

/** Se as horas já voltaram para quem cedeu. */
public enum SituacaoDaTroca {
  /** As horas estão com quem recebeu, a devolver. */
  PENDENTE,
  /** A devolução foi registrada. */
  CONCLUIDA
}
