package br.com.aerodash.aether.autenticacao;

/**
 * Um nome que aparece na tela. O {@code @NotBlank} só barra o espaço comum: um nome feito de espaço
 * sem quebra (U+00A0), de espaço de largura zero (U+200B) ou só de pontuação passa nele, e a pessoa
 * ou a empresa ficam com o nome em branco na lista. Exigir uma letra ou um dígito fecha os três.
 *
 * <p>Uso: {@code @Pattern(regexp = FormatoDeNome.EXPRESSAO, message = FormatoDeNome.MENSAGEM)}. A
 * mesma regra está em {@code compartilhado/cadastro/regrasDeCadastro.ts} ({@code nomeLegivel()}).
 */
public final class FormatoDeNome {

  public static final String EXPRESSAO = "(?s).*[\\p{L}\\p{N}].*";

  public static final String MENSAGEM = "Use letras ou números, e não só espaços ou sinais.";

  private FormatoDeNome() {}
}
