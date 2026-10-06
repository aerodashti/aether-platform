package br.com.aerodash.aether.fechamento;

/** Por que um custo foi parar em quem foi parar. Contado por competência, para a linha canônica. */
enum CriterioDeRateio {
  /** Atribuído a um proprietário no lançamento: vai inteiro para ele. */
  DIRETO,
  /** Fixo, ou variável sem uso a medir: pelo % de propriedade do contrato vigente na data. */
  PROPRIEDADE,
  /** Variável vinculado a um Rel. Voo: pelas horas de cada proprietário naquele voo. */
  VOO,
  /** Variável sem voo, com base por uso: pelas horas de cada proprietário no mês. */
  USO,
  /** Não havia contrato nenhum: o custo pesa no fundo, mas não na conta de ninguém. */
  SEM_CONTRATO
}
