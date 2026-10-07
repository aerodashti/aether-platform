package br.com.aerodash.aether.comum.validacao;

/**
 * O formato aceito para telefone em todo cadastro (proprietário, tripulante, empresa): dígitos, com
 * "+", espaço, parênteses e hífen opcionais, de 8 a 20 caracteres e pelo menos 8 dígitos — cabe o
 * "+55 11 98888-0000" do exemplo e o "3000-0000" de um ramal, e recusa "abc" ou "1".
 *
 * <p>Uso: {@code @Pattern(regexp = FormatoDeTelefone.EXPRESSAO, message =
 * FormatoDeTelefone.MENSAGEM)}. A mesma regra está em {@code compartilhado/formulario/regras.ts}
 * ({@code telefone()}).
 */
public final class FormatoDeTelefone {

  public static final String EXPRESSAO = "^(?=(?:\\D*\\d){8})\\+?[0-9 ()-]{8,20}$";

  public static final String MENSAGEM =
      "Use só números, com +, espaço, parênteses ou hífen, como +55 11 98888-0000.";

  private FormatoDeTelefone() {}
}
