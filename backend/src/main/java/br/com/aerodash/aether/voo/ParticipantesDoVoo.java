package br.com.aerodash.aether.voo;

/**
 * Quem pode receber a atribuição de um trecho: quem participa ou já participou da aeronave por
 * contrato. O trecho atribuído entra no % de uso do rateio, e quem não é dono não tem conta no
 * fechamento. Porta declarada aqui, respondida por {@code participacao} — veja {@code
 * docs/arquitetura.md}.
 */
public interface ParticipantesDoVoo {

  boolean participaOuParticipou(Long aeronaveId, Long proprietarioId);
}
