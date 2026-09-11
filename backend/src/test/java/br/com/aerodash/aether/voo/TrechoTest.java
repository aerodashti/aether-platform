package br.com.aerodash.aether.voo;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("Trecho")
class TrechoTest {

  private static final Instant AGORA = Instant.parse("2026-09-10T12:00:00Z");

  private Trecho trecho(
      LocalTime depPrev, LocalTime arrPrev, LocalTime depReal, LocalTime arrReal) {
    return new Trecho(
        1L,
        new DadosDoTrecho(
            " RV-2026-041 ",
            1,
            LocalDate.parse("2026-09-08"),
            "sbsp",
            "sbrj",
            new BigDecimal("365.0"),
            depPrev,
            arrPrev,
            depReal,
            arrReal,
            7L,
            "  "),
        AGORA);
  }

  @Test
  @DisplayName("normaliza aeródromos e apara o relatório; observação vazia vira nula")
  void normalizaAoCriar() {
    Trecho novo = trecho(null, null, null, null);

    assertThat(novo.getOrigem()).isEqualTo("SBSP");
    assertThat(novo.getDestino()).isEqualTo("SBRJ");
    assertThat(novo.getRelatorioDeVoo()).isEqualTo("RV-2026-041");
    assertThat(novo.getObservacoes()).isNull();
  }

  @Test
  @DisplayName("a duração usa o realizado quando o par está completo")
  void duracaoDoRealizado() {
    Trecho voado =
        trecho(
            LocalTime.parse("08:30"),
            LocalTime.parse("09:20"),
            LocalTime.parse("08:42"),
            LocalTime.parse("09:31"));

    assertThat(voado.duracaoEmHoras()).isEqualByComparingTo("0.8");
  }

  @Test
  @DisplayName("sem realizado completo, vale o previsto — realizado pela metade não conta")
  void duracaoDoPrevisto() {
    Trecho previsto =
        trecho(LocalTime.parse("09:00"), LocalTime.parse("11:40"), LocalTime.parse("09:05"), null);

    assertThat(previsto.duracaoEmHoras()).isEqualByComparingTo("2.7");
  }

  @Test
  @DisplayName("pouso antes da partida é virada de meia-noite, não voo negativo")
  void viradaDeMeiaNoite() {
    Trecho madrugada = trecho(LocalTime.parse("23:30"), LocalTime.parse("01:00"), null, null);

    assertThat(madrugada.duracaoEmHoras()).isEqualByComparingTo("1.5");
  }

  @Test
  @DisplayName("sem par de horários não há duração — nulo, e zero para os contadores")
  void semHorarios() {
    Trecho vazio = trecho(null, null, null, null);

    assertThat(vazio.duracaoEmHoras()).isNull();
    assertThat(vazio.horasParaContadores()).isEqualByComparingTo("0");
  }

  @Test
  @DisplayName("sem proprietário é voo de manutenção")
  void vooDeManutencao() {
    Trecho manutencao =
        new Trecho(
            1L,
            new DadosDoTrecho(
                "RV-1",
                1,
                LocalDate.parse("2026-09-08"),
                "SBSP",
                "SBJD",
                BigDecimal.ONE,
                null,
                null,
                null,
                null,
                null,
                null),
            AGORA);

    assertThat(manutencao.ehVooDeManutencao()).isTrue();
    assertThat(trecho(null, null, null, null).ehVooDeManutencao()).isFalse();
  }
}
