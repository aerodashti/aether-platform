package br.com.aerodash.aether.aporte;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.YearMonth;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("JanelaDeCompetencias")
class JanelaDeCompetenciasTest {

  private final JanelaDeCompetencias janela =
      JanelaDeCompetencias.aPartirDa(YearMonth.of(2026, 10));

  @Test
  @DisplayName("vai de janeiro de 2000 a doze meses à frente da corrente, com as duas pontas")
  void pontas() {
    assertThat(janela.aceita(YearMonth.of(2000, 1))).isTrue();
    assertThat(janela.aceita(YearMonth.of(2027, 10))).isTrue();
    assertThat(janela.aceita(YearMonth.of(1999, 12))).isFalse();
    assertThat(janela.aceita(YearMonth.of(2027, 11))).isFalse();
    assertThat(janela.aceita(YearMonth.of(9999, 12))).isFalse();
  }

  @Test
  @DisplayName("ausente é sem limite, e a recusa diz a janela")
  void ausenteERecusa() {
    assertThat(janela.aceita(null)).isTrue();
    assertThat(janela.recusa()).isEqualTo("Use uma competência de 01/2000 até 10/2027.");
  }
}
