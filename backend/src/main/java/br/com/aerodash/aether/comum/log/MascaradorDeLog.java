package br.com.aerodash.aether.comum.log;

/**
 * Reduz dado pessoal a uma forma que ainda serve para diagnóstico mas não identifica ninguém.
 *
 * <p>Nenhum dado pessoal vai para o log sem passar por aqui. Ao acrescentar um tipo novo de dado
 * sensível, acrescente também o teste correspondente em {@code MascaradorDeLogTest}.
 */
public final class MascaradorDeLog {

  private static final String OCULTO = "***";
  private static final int DIGITOS_DO_CPF = 11;

  private MascaradorDeLog() {}

  /** Preserva apenas os cinco últimos dígitos: {@code 12345678901} vira {@code ***.***.789-01}. */
  public static String mascararCpf(String cpf) {
    if (cpf == null) {
      return OCULTO;
    }
    String digitos = cpf.replaceAll("\\D", "");
    if (digitos.length() != DIGITOS_DO_CPF) {
      return OCULTO;
    }
    return "***.***." + digitos.substring(6, 9) + "-" + digitos.substring(9);
  }

  /** Preserva a primeira letra e o domínio: {@code ana@x.com} vira {@code a**@x.com}. */
  public static String mascararEmail(String email) {
    if (email == null) {
      return OCULTO;
    }
    int arroba = email.indexOf('@');
    if (arroba < 1) {
      return OCULTO;
    }
    String dominio = email.substring(arroba);
    return email.charAt(0) + "*".repeat(arroba - 1) + dominio;
  }

  /** Token e senha nunca aparecem, nem parcialmente. */
  public static String mascararToken(String token) {
    return OCULTO;
  }
}
