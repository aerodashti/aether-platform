package br.com.aerodash.aether.aeronave;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("FichaTecnica")
class FichaTecnicaTest {

  @Test
  @DisplayName("texto opcional vazio ou só de espaços vira ausência; o resto é aparado")
  void normalizaTextos() {
    FichaTecnica ficha =
        new FichaTecnica("   ", "  Citation XLS+  ", "", " sbjd ", " Hangar 7 ", "  ", null, null);

    assertThat(ficha.fabricante()).isNull();
    assertThat(ficha.modelo()).isEqualTo("Citation XLS+");
    assertThat(ficha.numeroDeSerie()).isNull();
    assertThat(ficha.base()).isEqualTo("SBJD");
    assertThat(ficha.hangar()).isEqualTo("Hangar 7");
    assertThat(ficha.apoliceDoSeguro()).isNull();
  }

  @Test
  @DisplayName("o peso de pouso não passa do de decolagem; sem um dos dois, não há o que comparar")
  void pesosCoerentes() {
    assertThat(comPesos(8300, 7665).possuiPesosCoerentes()).isTrue();
    assertThat(comPesos(8300, 8300).possuiPesosCoerentes()).isTrue();
    assertThat(comPesos(1000, 90000).possuiPesosCoerentes()).isFalse();
    assertThat(comPesos(null, 90000).possuiPesosCoerentes()).isTrue();
    assertThat(comPesos(8300, null).possuiPesosCoerentes()).isTrue();
  }

  private static FichaTecnica comPesos(Integer decolagem, Integer pouso) {
    return new FichaTecnica(null, "PC-24", "SBJD", null, null, null, decolagem, pouso);
  }
}
