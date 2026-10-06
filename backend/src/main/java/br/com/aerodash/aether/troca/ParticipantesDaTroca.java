package br.com.aerodash.aether.troca;

/**
 * Quem pode ceder ou receber horas numa aeronave: quem participa ou já participou dela por
 * contrato. Porta declarada aqui, respondida por {@code participacao} — veja {@code
 * docs/arquitetura.md}.
 */
public interface ParticipantesDaTroca {

  boolean participaOuParticipou(Long aeronaveId, Long proprietarioId);
}
