package br.com.aerodash.aether.proprietario;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * O texto é um CPF ou um CNPJ válido, com ou sem pontuação — ou está em branco.
 *
 * <p>Existe para o documento errado sair no mesmo 400 dos demais campos, em {@code campos}: sem
 * isto, quem erra o e-mail e o CPF descobre um erro de cada vez, em duas tentativas.
 */
@Documented
@Constraint(validatedBy = ValidadorDeCpfCnpj.class)
@Target({ElementType.FIELD, ElementType.METHOD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
public @interface CpfCnpjValido {

  String message() default CpfCnpj.MENSAGEM_DE_INVALIDO;

  Class<?>[] groups() default {};

  Class<? extends Payload>[] payload() default {};
}
