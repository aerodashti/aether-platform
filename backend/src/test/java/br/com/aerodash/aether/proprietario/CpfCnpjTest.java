package br.com.aerodash.aether.proprietario;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

@DisplayName("CpfCnpj")
class CpfCnpjTest {

  @Nested
  @DisplayName("normalização")
  class Normalizacao {

    @Test
    @DisplayName("tira a pontuação e põe as letras em maiúsculas")
    void tiraPontuacao() {
      assertThat(CpfCnpj.normalizar("529.982.247-25")).isEqualTo("52998224725");
      assertThat(CpfCnpj.normalizar("12.abc.345/01de-35")).isEqualTo("12ABC34501DE35");
      assertThat(CpfCnpj.normalizar(" 529\u00a0982 247 25 ")).isEqualTo("52998224725");
    }

    @Test
    @DisplayName("só o campo em branco é ausência")
    void soOBrancoEhAusencia() {
      assertThat(CpfCnpj.normalizar(null)).isNull();
      assertThat(CpfCnpj.normalizar("   ")).isNull();
      assertThat(CpfCnpj.normalizar("não tenho")).isNotNull();
      assertThat(CpfCnpj.normalizar("...")).isEmpty();
    }
  }

  @Nested
  @DisplayName("validação")
  class Validacao {

    @Test
    @DisplayName("aceita CPF e CNPJ numéricos com verificadores certos, e a ausência")
    void aceitaNumericos() {
      assertThat(CpfCnpj.ehValido("52998224725")).isTrue();
      assertThat(CpfCnpj.ehValido("12345678909")).isTrue();
      assertThat(CpfCnpj.ehValido("11444777000161")).isTrue();
      assertThat(CpfCnpj.ehValido(null)).isTrue();
    }

    @Test
    @DisplayName("aceita o CNPJ alfanumérico, com letras nos 12 primeiros caracteres")
    void aceitaCnpjAlfanumerico() {
      // O exemplo da Receita na IN RFB 2.229/2024.
      assertThat(CpfCnpj.ehValido("12ABC34501DE35")).isTrue();
    }

    @ParameterizedTest(name = "{0}")
    @ValueSource(strings = {"52998224726", "12345678901", "11444777000162", "12ABC34501DE36"})
    @DisplayName("recusa verificador errado: é o documento do titular no RAB")
    void recusaVerificadorErrado(String documento) {
      assertThat(CpfCnpj.ehValido(documento)).isFalse();
    }

    @ParameterizedTest(name = "{0}")
    @ValueSource(strings = {"5299822472A", "12ABC34501DEA5", "12ABC34501DE3B"})
    @DisplayName("recusa letra no CPF e nos verificadores do CNPJ")
    void recusaLetraForaDoLugar(String documento) {
      assertThat(CpfCnpj.ehValido(documento)).isFalse();
    }

    @ParameterizedTest(name = "{0}")
    @ValueSource(strings = {"não tenho", "x153.509.460-56abc", "otavio@exemplo", "...", "123"})
    @DisplayName("texto que não é documento é recusado, e não vira 'sem documento'")
    void recusaTextoQualquer(String texto) {
      assertThat(CpfCnpj.ehValido(CpfCnpj.normalizar(texto))).isFalse();
    }

    @Test
    @DisplayName("recusa a sequência repetida, que passa na conta mas não existe")
    void recusaSequenciaRepetida() {
      assertThat(CpfCnpj.ehValido("11111111111")).isFalse();
      assertThat(CpfCnpj.ehValido("00000000000000")).isFalse();
    }
  }
}
