package br.com.aerodash.aether.autenticacao;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import java.nio.charset.StandardCharsets;

/** Mede a senha como o BCrypt a mede: em bytes UTF-8, não em caracteres. */
public class ValidadorDoLimiteDoBcrypt implements ConstraintValidator<CabeNoBcrypt, String> {

  /** O spring-security-crypto recusa com exceção o que passa disso. */
  static final int LIMITE_EM_BYTES = 72;

  @Override
  public boolean isValid(String senha, ConstraintValidatorContext contexto) {
    return senha == null || senha.getBytes(StandardCharsets.UTF_8).length <= LIMITE_EM_BYTES;
  }
}
