package br.com.aerodash.aether.aeronave;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("FichaTecnica")
class FichaTecnicaTest {

  private static FichaTecnica comPesos(Integer decolagem, Integer pouso) {
    return new FichaTecnica("Pilatus", "PC-12 NGX", null, "SBPS", null, null, decolagem, pouso);
  }

  @Test
  @DisplayName("apara as pontas, e o opcional em branco vira nulo — não texto vazio")
  void normalizaOsTextos() {
    FichaTecnica ficha =
        new FichaTecnica("", "  Pilatus PC-12 NGX  ", "   ", " sbps ", "\t", "  ", null, null);

    assertThat(ficha.fabricante()).isNull();
    assertThat(ficha.modelo()).isEqualTo("Pilatus PC-12 NGX");
    assertThat(ficha.numeroDeSerie()).isNull();
    assertThat(ficha.base()).isEqualTo("SBPS");
    assertThat(ficha.hangar()).isNull();
    assertThat(ficha.apoliceDoSeguro()).isNull();
  }

  @Test
  @DisplayName("o texto informado é guardado sem os espaços das pontas")
  void preservaOTextoInformado() {
    FichaTecnica ficha =
        new FichaTecnica(" Cessna ", "XLS+", " 560-6321 ", "SBSP", " Hangar 7 ", " R-1 ", 1, 1);

    assertThat(ficha.fabricante()).isEqualTo("Cessna");
    assertThat(ficha.numeroDeSerie()).isEqualTo("560-6321");
    assertThat(ficha.hangar()).isEqualTo("Hangar 7");
    assertThat(ficha.apoliceDoSeguro()).isEqualTo("R-1");
  }

  @Test
  @DisplayName("pouso acima da decolagem não é coerente; igual ou abaixo é")
  void pesosCoerentes() {
    assertThat(comPesos(5670, 9999).possuiPesosCoerentes()).isFalse();
    assertThat(comPesos(5670, 5670).possuiPesosCoerentes()).isTrue();
    assertThat(comPesos(9163, 8482).possuiPesosCoerentes()).isTrue();
  }

  @Test
  @DisplayName("sem um dos pesos não há relação a conferir")
  void pesoAusenteNaoTemRelacao() {
    assertThat(comPesos(null, 9999).possuiPesosCoerentes()).isTrue();
    assertThat(comPesos(5670, null).possuiPesosCoerentes()).isTrue();
  }
}
