package br.com.aerodash.aether.autenticacao;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("ValidadorDeSenhaNova")
class ValidadorDeSenhaNovaTest {

  private static ValidatorFactory fabrica;
  private static Validator validador;

  @BeforeAll
  static void montar() {
    fabrica = Validation.buildDefaultValidatorFactory();
    validador = fabrica.getValidator();
  }

  @AfterAll
  static void desmontar() {
    fabrica.close();
  }

  @Test
  @DisplayName("aceita de 8 caracteres a 72 bytes")
  void aceitaDentroDosLimites() {
    assertThat(mensagensPara("12345678")).isEmpty();
    assertThat(mensagensPara("a".repeat(72))).isEmpty();
    assertThat(mensagensPara("ç".repeat(36))).isEmpty();
  }

  @Test
  @DisplayName("recusa a senha curta dizendo o mínimo")
  void recusaCurta() {
    assertThat(mensagensPara("1234567")).containsExactly(ValidadorDeSenhaNova.MENSAGEM_DE_MINIMO);
  }

  @Test
  @DisplayName("conta bytes, não caracteres: 37 letras acentuadas já passam do teto do BCrypt")
  void contaBytes() {
    assertThat(mensagensPara("ç".repeat(37)))
        .containsExactly(ValidadorDeSenhaNova.MENSAGEM_DE_MAXIMO);
    assertThat(mensagensPara("a".repeat(73)))
        .containsExactly(ValidadorDeSenhaNova.MENSAGEM_DE_MAXIMO);
  }

  @Test
  @DisplayName("vazio fica para o @NotBlank, com a mensagem de falta")
  void vazioFicaParaONotBlank() {
    assertThat(mensagensPara("   ")).containsExactly("Informe a nova senha.");
  }

  private static Set<String> mensagensPara(String senha) {
    Set<ConstraintViolation<ConcluirConviteRequest>> violacoes =
        validador.validate(new ConcluirConviteRequest("token-do-link", senha));
    return violacoes.stream().map(ConstraintViolation::getMessage).collect(Collectors.toSet());
  }
}
