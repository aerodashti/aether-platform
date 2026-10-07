package br.com.aerodash.aether.autenticacao;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import java.nio.charset.StandardCharsets;

/** Confere os dois limites de {@link SenhaNova} e diz qual deles a senha passou. */
public class ValidadorDeSenhaNova implements ConstraintValidator<SenhaNova, String> {

  static final int MINIMO_DE_CARACTERES = 8;
  static final int MAXIMO_DE_BYTES = 72;

  static final String MENSAGEM_DE_MINIMO =
      "A senha precisa de ao menos " + MINIMO_DE_CARACTERES + " caracteres.";
  static final String MENSAGEM_DE_MAXIMO =
      "A senha passa do limite de "
          + MAXIMO_DE_BYTES
          + " caracteres (letras acentuadas e símbolos contam como dois ou mais).";

  @Override
  public boolean isValid(String senha, ConstraintValidatorContext contexto) {
    if (senha == null || senha.isBlank()) {
      return true;
    }
    String falha = falhaDe(senha);
    if (falha == null) {
      return true;
    }
    contexto.disableDefaultConstraintViolation();
    contexto.buildConstraintViolationWithTemplate(falha).addConstraintViolation();
    return false;
  }

  private static String falhaDe(String senha) {
    if (senha.codePointCount(0, senha.length()) < MINIMO_DE_CARACTERES) {
      return MENSAGEM_DE_MINIMO;
    }
    if (senha.getBytes(StandardCharsets.UTF_8).length > MAXIMO_DE_BYTES) {
      return MENSAGEM_DE_MAXIMO;
    }
    return null;
  }
}
