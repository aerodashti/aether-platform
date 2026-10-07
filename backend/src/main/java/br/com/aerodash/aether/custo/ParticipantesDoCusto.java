package br.com.aerodash.aether.custo;

/**
 * Quem pode receber um custo atribuído: quem participa ou já participou da aeronave por contrato.
 * Sem isto, o fechamento cobraria o custo de quem não é dono. Porta declarada aqui, respondida por
 * {@code participacao} — veja {@code docs/arquitetura.md}.
 */
public interface ParticipantesDoCusto {

  boolean participaOuParticipou(Long aeronaveId, Long proprietarioId);
}
