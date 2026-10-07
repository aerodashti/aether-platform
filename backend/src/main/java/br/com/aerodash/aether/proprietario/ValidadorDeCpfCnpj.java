package br.com.aerodash.aether.proprietario;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

/** A régua de {@link CpfCnpj} aplicada ao request, antes de o service ser chamado. */
public class ValidadorDeCpfCnpj implements ConstraintValidator<CpfCnpjValido, String> {

  @Override
  public boolean isValid(String texto, ConstraintValidatorContext contexto) {
    return CpfCnpj.ehValido(CpfCnpj.normalizar(texto));
  }
}
