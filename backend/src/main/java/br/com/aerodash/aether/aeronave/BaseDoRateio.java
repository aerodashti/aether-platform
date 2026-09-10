package br.com.aerodash.aether.aeronave;

/** Como o custo é dividido entre os proprietários: pelo uso medido ou pelo contrato. */
public enum BaseDoRateio {
  /** Pelas horas ou km voados de cada proprietário no período. */
  POR_USO,
  /** Pelo percentual de propriedade do contrato de participação vigente. */
  POR_PROPRIEDADE
}
