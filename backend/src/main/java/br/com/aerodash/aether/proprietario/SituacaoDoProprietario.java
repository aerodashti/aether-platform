package br.com.aerodash.aether.proprietario;

/**
 * Se o proprietário participa da operação hoje.
 *
 * <p>Desativar não apaga ninguém: o histórico financeiro continua apontando para a pessoa, e é
 * exatamente por isso que excluir de verdade não existe neste domínio.
 */
public enum SituacaoDoProprietario {
  ATIVO,
  INATIVO
}
