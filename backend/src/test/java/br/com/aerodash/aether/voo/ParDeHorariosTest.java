package br.com.aerodash.aether.voo;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.time.LocalDate;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("ParDeHorarios")
class ParDeHorariosTest {

  private static final LocalDate DATA = LocalDate.parse("2026-09-10");

  private static ParDeHorarios par(String partida, String pouso) {
    return new ParDeHorarios(
        partida == null ? null : Instant.parse(partida),
        pouso == null ? null : Instant.parse(pouso));
  }

  @Test
  @DisplayName("pouso na mesma hora da partida não é voo de 24 h: é incoerente")
  void pousoNaMesmaHora() {
    assertThat(par("2026-09-10T13:00:00Z", "2026-09-10T13:00:00Z").possuiPousoDepoisDaPartida())
        .isFalse();
    assertThat(par("2026-09-10T13:00:00Z", "2026-09-10T13:01:00Z").possuiPousoDepoisDaPartida())
        .isTrue();
  }

  @Test
  @DisplayName("um trecho dura até 24 h; um minuto a mais é data errada")
  void duracaoMaxima() {
    assertThat(par("2026-09-10T10:00:00Z", "2026-09-11T10:00:00Z").possuiDuracaoPlausivel())
        .isTrue();
    assertThat(par("2026-09-10T10:00:00Z", "2026-09-11T10:01:00Z").possuiDuracaoPlausivel())
        .isFalse();
  }

  @Test
  @DisplayName("a partida fica a no máximo um dia da data do trecho")
  void partidaPertoDaData() {
    assertThat(par("2026-09-11T03:20:00Z", null).possuiPartidaPertoDe(DATA)).isTrue();
    assertThat(par("2026-09-09T23:00:00Z", null).possuiPartidaPertoDe(DATA)).isTrue();
    assertThat(par("2026-09-12T00:00:00Z", null).possuiPartidaPertoDe(DATA)).isFalse();
    assertThat(par("2031-01-01T10:00:00Z", null).possuiPartidaPertoDe(DATA)).isFalse();
    assertThat(par(null, "2031-01-01T10:00:00Z").possuiPartidaPertoDe(DATA)).isTrue();
  }

  @Test
  @DisplayName("o par pela metade é dito de que lado falta; as regras de coerência o ignoram")
  void parPelaMetade() {
    ParDeHorarios soPouso = par(null, "2026-09-10T13:00:00Z");
    ParDeHorarios soPartida = par("2026-09-10T13:00:00Z", null);

    assertThat(soPouso.possuiPousoSemPartida()).isTrue();
    assertThat(soPartida.possuiPartidaSemPouso()).isTrue();
    assertThat(soPouso.estaCompleto()).isFalse();
    assertThat(soPouso.possuiPousoDepoisDaPartida()).isTrue();
    assertThat(soPouso.horas()).isNull();
  }

  @Test
  @DisplayName("a duração em horas tem uma casa, arredondada para cima no meio")
  void horas() {
    assertThat(par("2026-09-10T08:42:00Z", "2026-09-10T09:31:00Z").horas())
        .isEqualByComparingTo("0.8");
  }
}
