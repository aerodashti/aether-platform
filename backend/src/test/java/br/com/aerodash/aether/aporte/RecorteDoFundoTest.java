package br.com.aerodash.aether.aporte;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;

import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import java.time.YearMonth;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("RecorteDoFundo")
class RecorteDoFundoTest {

  private static final YearMonth CORRENTE = YearMonth.of(2026, 10);

  @Mock private ContextoDaRequisicao contexto;

  @Test
  @DisplayName("competência fora da janela é recusada no parâmetro que a trouxe")
  void foraDaJanela() {
    assertThatThrownBy(
            () ->
                RecorteDoFundo.exigirPeriodo(
                    "rendimentos", null, YearMonth.of(9999, 12), CORRENTE, contexto))
        .isInstanceOf(AporteInvalidoException.class)
        .hasMessage("Use uma competência de 01/2000 até 10/2027.")
        .extracting(falha -> ((AporteInvalidoException) falha).getCampo())
        .isEqualTo(Optional.of("ate"));
    verify(contexto).decisao("rendimentos.ateNaJanela", false);
  }

  @Test
  @DisplayName("período invertido é recusado no de; o lado vazio é sem limite")
  void ordem() {
    assertThatThrownBy(
            () ->
                RecorteDoFundo.exigirPeriodo(
                    "aportes", YearMonth.of(2026, 10), YearMonth.of(2026, 1), CORRENTE, contexto))
        .isInstanceOf(AporteInvalidoException.class)
        .hasMessage("A competência inicial vem depois da final.")
        .extracting(falha -> ((AporteInvalidoException) falha).getCampo())
        .isEqualTo(Optional.of("de"));

    PeriodoDeCompetencias aberto =
        RecorteDoFundo.exigirPeriodo("aportes", YearMonth.of(2026, 1), null, CORRENTE, contexto);
    assertThat(aberto.de()).isEqualTo(YearMonth.of(2026, 1));
    assertThat(aberto.ate()).isEqualTo(YearMonth.of(9999, 12));
  }
}
