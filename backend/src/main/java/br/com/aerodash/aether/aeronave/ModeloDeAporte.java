package br.com.aerodash.aether.aeronave;

/** Como o aporte ao fundo é calculado. */
public enum ModeloDeAporte {
  /** Valor fixo por período, definido em {@code valorDoAporte}. */
  FIXO,
  /** Proporcional ao uso apurado no período. */
  PROPORCIONAL_AO_USO
}
