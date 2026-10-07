package br.com.aerodash.aether.autenticacao;

import static java.lang.annotation.ElementType.FIELD;
import static java.lang.annotation.ElementType.PARAMETER;
import static java.lang.annotation.ElementType.RECORD_COMPONENT;
import static java.lang.annotation.RetentionPolicy.RUNTIME;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.Target;

/**
 * A senha que a pessoa escolhe: ao menos 8 caracteres e no máximo 72 bytes em UTF-8.
 *
 * <p>O teto é o do BCrypt, que recusa com exceção o que passa de 72 bytes — e 72 caracteres
 * acentuados ocupam 144. Um {@code @Size} conta caracteres e deixaria esse caso virar 500. Vazio
 * passa: quem cobra a falta é o {@code @NotBlank} ao lado, com a mensagem própria.
 *
 * <p>A mesma regra está na tela, em {@code features/autenticacao/componentes/regrasDeSenha.ts}.
 */
@Documented
@Constraint(validatedBy = ValidadorDeSenhaNova.class)
@Target({FIELD, PARAMETER, RECORD_COMPONENT})
@Retention(RUNTIME)
public @interface SenhaNova {

  /** Substituída pela mensagem do limite que falhou; fica só porque a especificação a exige. */
  String message() default "A senha está fora do tamanho aceito.";

  Class<?>[] groups() default {};

  Class<? extends Payload>[] payload() default {};
}
