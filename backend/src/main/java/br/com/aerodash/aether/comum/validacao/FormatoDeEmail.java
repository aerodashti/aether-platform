package br.com.aerodash.aether.comum.validacao;

/**
 * O e-mail que alguém consegue receber, em todo request que pede um: acesso, convite, empresa,
 * proprietário e tripulante. O {@code @Email} do Hibernate aceita domínio sem ponto
 * ("fulano@exemplo"), e um convite para esse endereço cria um usuário PENDENTE cujo link nunca
 * chega. Aqui o domínio precisa de ponto e de um sufixo com duas letras ou mais. Vazio passa: o
 * opcional em branco é "não informado", e quem cobra a falta é o {@code @NotBlank}.
 *
 * <p>Uso, junto do {@code @Email}: {@code @Email(regexp = FormatoDeEmail.EXPRESSAO, message =
 * FormatoDeEmail.MENSAGEM)}. A mesma regra está em {@code compartilhado/formulario/regras.ts}
 * ({@code email()}).
 */
public final class FormatoDeEmail {

  public static final String EXPRESSAO = "^[^@]+@[^@]+\\.[^@.]{2,}$";

  public static final String MENSAGEM = "Informe um e-mail válido, como nome@empresa.com.br.";

  private FormatoDeEmail() {}
}
