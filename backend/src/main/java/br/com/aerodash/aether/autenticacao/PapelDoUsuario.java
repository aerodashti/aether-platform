package br.com.aerodash.aether.autenticacao;

/**
 * O que a pessoa é no Aether — distinto de {@link SituacaoDoUsuario}, que diz apenas se ela pode
 * entrar. Alguém pode ser {@code ADMINISTRADOR} e estar {@code INATIVO}.
 *
 * <p>Um papel por pessoa, gravado em coluna do próprio usuário. Nada no produto hoje pede que
 * alguém acumule papéis; quando pedir, a mudança é uma tabela de associação, não um remendo aqui.
 */
public enum PapelDoUsuario {

  /** Único papel que administra usuários: convida, reenvia convite, desativa e reativa. */
  ADMINISTRADOR,

  /** Opera o dia a dia: registra voos, lançamentos e fechamentos. */
  GESTOR,

  /** Titular de aeronave. Vê o que é seu; não registra nem administra. */
  PROPRIETARIO,

  /** Tripulação. Registra voo e consulta a própria escala. */
  PILOTO
}
