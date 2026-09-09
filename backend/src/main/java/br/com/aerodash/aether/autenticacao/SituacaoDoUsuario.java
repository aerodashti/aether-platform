package br.com.aerodash.aether.autenticacao;

/**
 * Onde o usuário está no seu ciclo de vida.
 *
 * <p>{@code PENDENTE} é o estado de quem foi convidado e ainda não criou a própria senha: o
 * administrador cadastra a pessoa, mas nunca define a senha dela.
 */
public enum SituacaoDoUsuario {
  ATIVO,
  PENDENTE,
  INATIVO
}
