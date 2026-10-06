package br.com.aerodash.aether.aviso;

/** De onde o aviso vem — os chips da Central. */
public enum CategoriaDoAviso {
  /** CVA e seguro RETA: os dois documentos que decidem se a aeronave voa. */
  DOCUMENTOS,
  /** Parâmetros de controle perto do limite ou estourados, e manutenções programadas atrasadas. */
  MANUTENCAO,
  /** CMA e CHT dos tripulantes ativos. */
  TRIPULACAO,
  /** Fundo da aeronave com saldo negativo. */
  FUNDOS
}
