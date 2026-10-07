package br.com.aerodash.aether.autenticacao;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * A senha cabe no BCrypt: até 72 bytes em UTF-8.
 *
 * <p>O {@code @Size(max = 72)} conta caracteres, e uma frase-senha com acentos passa nele com mais
 * de 72 bytes ("ç" ocupa dois). O BCrypt recusa esse valor com exceção, e a troca respondia 500
 * depois de a pessoa já ter provado a senha atual e o código.
 */
@Documented
@Constraint(validatedBy = ValidadorDoLimiteDoBcrypt.class)
@Target({ElementType.FIELD, ElementType.METHOD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
public @interface CabeNoBcrypt {

  String message() default
      "A senha passa do limite: letras com acento e emojis contam como mais de um caractere.";

  Class<?>[] groups() default {};

  Class<? extends Payload>[] payload() default {};
}
