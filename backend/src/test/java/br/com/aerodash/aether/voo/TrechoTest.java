package br.com.aerodash.aether.voo;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("Trecho")
class TrechoTest {

  private static final Instant AGORA = Instant.parse("2026-09-10T12:00:00Z");

  /** Um instante em 08/09/2026, em UTC — "08:30" vira 2026-09-08T08:30:00Z. */
  private static Instant h(String hora) {
    return Instant.parse("2026-09-08T" + hora + ":00Z");
  }

  private Trecho trecho(Instant depPrev, Instant arrPrev, Instant depReal, Instant arrReal) {
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
  @DisplayName("o Rel. Voo vai em maiúsculas: 'rv-2026-041' é o mesmo voo que 'RV-2026-041'")
  void relatorioEmMaiusculas() {
    assertThat(Trecho.normalizarRelatorio("  rv-2026-041 ")).isEqualTo("RV-2026-041");
  }

  @Test
  @DisplayName("realizado é fato: de 2000 até hoje; planejado vai de um ano atrás a dez à frente")
  void janelaDaData() {
    LocalDate hoje = LocalDate.parse("2026-10-07");

    assertThat(trecho(h("08:30"), h("09:20"), h("08:42"), h("09:31")).janelaDaData(hoje))
        .isEqualTo(new Trecho.JanelaDeDatas(LocalDate.parse("2000-01-01"), hoje));
    assertThat(trecho(h("08:30"), h("09:20"), null, null).janelaDaData(hoje))
        .isEqualTo(
            new Trecho.JanelaDeDatas(LocalDate.parse("2025-10-07"), LocalDate.parse("2036-10-07")));
  }

  @Test
  @DisplayName("horário realizado depois do limite (agora + folga) é recusado; o planejado, não")
  void realizadoNoFuturo() {
    Trecho voado = trecho(null, null, h("08:42"), h("09:31"));

    assertThat(voado.possuiRealizadoAte(h("09:31"))).isTrue();
    assertThat(voado.possuiRealizadoAte(h("09:30"))).isFalse();
    assertThat(trecho(h("23:00"), h("23:50"), null, null).possuiRealizadoAte(h("00:00"))).isTrue();
  }

  @Test
  @DisplayName("a duração usa o realizado quando o par está completo")
  void duracaoDoRealizado() {
    Trecho voado = trecho(h("08:30"), h("09:20"), h("08:42"), h("09:31"));

    assertThat(voado.duracaoEmHoras()).isEqualByComparingTo("0.8");
  }

  @Test
  @DisplayName("sem realizado completo, vale o previsto — realizado pela metade não conta")
  void duracaoDoPrevisto() {
    Trecho previsto = trecho(h("09:00"), h("11:40"), h("09:05"), null);

    assertThat(previsto.duracaoEmHoras()).isEqualByComparingTo("2.7");
  }

  @Test
  @DisplayName("virada de meia-noite é o pouso no dia seguinte: a duração vem dos instantes")
  void viradaDeMeiaNoite() {
    Trecho madrugada = trecho(h("23:30"), Instant.parse("2026-09-09T01:00:00Z"), null, null);

    assertThat(madrugada.duracaoEmHoras()).isEqualByComparingTo("1.5");
  }

  @Test
  @DisplayName("só o trecho realizado soma nos contadores; o previsto ainda pesa no rateio")
  void soORealizadoMoveOsContadores() {
    Trecho planejado = trecho(h("09:00"), h("11:40"), null, null);
    Trecho voado = trecho(h("09:00"), h("11:40"), h("09:05"), h("11:50"));

    assertThat(planejado.estaRealizado()).isFalse();
    assertThat(planejado.horasParaContadores()).isEqualByComparingTo("0");
    assertThat(planejado.horasParaRateio()).isEqualByComparingTo("2.7");
    assertThat(voado.estaRealizado()).isTrue();
    assertThat(voado.horasParaContadores()).isEqualByComparingTo("2.8");
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
