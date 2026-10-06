package br.com.aerodash.aether.aporte;

/**
 * Quem pode aportar no fundo de uma aeronave: quem participa ou já participou dela por contrato.
 *
 * <p>Já participou conta: quem saiu do contrato ainda pode quitar o que devia. É uma porta,
 * declarada aqui, que consome a resposta; quem responde é {@code participacao}, que governa os
 * contratos — veja {@code docs/arquitetura.md}.
 */
public interface ParticipantesDaAeronave {

  boolean participaOuParticipou(Long aeronaveId, Long proprietarioId);
}
