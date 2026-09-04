package br.com.aerodash.aether.comum.log;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("MascaradorDeLog")
class MascaradorDeLogTest {

  @Test
  @DisplayName("preserva apenas os cinco últimos dígitos do CPF")
  void mascararCpfPreservaApenasOFinal() {
    assertThat(MascaradorDeLog.mascararCpf("12345678901")).isEqualTo("***.***.789-01");
    assertThat(MascaradorDeLog.mascararCpf("123.456.789-01")).isEqualTo("***.***.789-01");
  }

  @Test
  @DisplayName("oculta CPF nulo ou com quantidade errada de dígitos")
  void mascararCpfOcultaEntradaInvalida() {
    assertThat(MascaradorDeLog.mascararCpf(null)).isEqualTo("***");
    assertThat(MascaradorDeLog.mascararCpf("123")).isEqualTo("***");
  }

  @Test
  @DisplayName("preserva a primeira letra e o domínio do e-mail")
  void mascararEmailPreservaDominio() {
    assertThat(MascaradorDeLog.mascararEmail("ana@x.com")).isEqualTo("a**@x.com");
    assertThat(MascaradorDeLog.mascararEmail("proprietario@aerodash.com.br"))
        .isEqualTo("p***********@aerodash.com.br");
  }

  @Test
  @DisplayName("oculta e-mail nulo ou sem parte local")
  void mascararEmailOcultaEntradaInvalida() {
    assertThat(MascaradorDeLog.mascararEmail(null)).isEqualTo("***");
    assertThat(MascaradorDeLog.mascararEmail("@x.com")).isEqualTo("***");
    assertThat(MascaradorDeLog.mascararEmail("semArroba")).isEqualTo("***");
  }

  @Test
  @DisplayName("nunca deixa vazar nenhum trecho de token")
  void mascararTokenNaoRevelaNada() {
    String token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abc.def";
    assertThat(MascaradorDeLog.mascararToken(token)).isEqualTo("***").doesNotContain("eyJ");
    assertThat(MascaradorDeLog.mascararToken(null)).isEqualTo("***");
  }
}
