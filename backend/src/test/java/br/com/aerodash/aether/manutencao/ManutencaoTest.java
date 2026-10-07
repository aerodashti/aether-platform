package br.com.aerodash.aether.manutencao;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("Manutencao")
class ManutencaoTest {

  private static final Instant AGORA = Instant.parse("2026-09-10T12:00:00Z");
  private static final LocalDate HOJE = LocalDate.parse("2026-09-10");

  /** U+00A0: o {@code trim()} do Java não o tira; o do JavaScript, sim. */
  private static final String ESPACO_NAO_SEPARAVEL = Character.toString(0x00A0);

  private static final String ESPACO_DE_NUMERO = Character.toString(0x2007);

  private static Manutencao programadaPara(LocalDate data) {
    return new Manutencao(1L, new DadosDaManutencao(data, null, null, "Inspeção", null), AGORA);
  }

  @Test
  @DisplayName("nasce programada; concluir grava o dia e reabrir o apaga")
  void cicloDeStatus() {
    Manutencao manutencao =
        new Manutencao(
            1L,
            new DadosDaManutencao(
                LocalDate.parse("2026-09-22"),
                LocalTime.parse("09:00"),
                " Hangar Líder ",
                " Inspeção de 100 h ",
                new BigDecimal("48000.00")),
            AGORA);

    assertThat(manutencao.estaConcluida()).isFalse();
    assertThat(manutencao.getConcluidaEm()).isNull();
    assertThat(manutencao.getResponsavel()).isEqualTo("Hangar Líder");
    assertThat(manutencao.getDescricao()).isEqualTo("Inspeção de 100 h");

    manutencao.concluir(LocalDate.parse("2026-09-08"), AGORA);
    assertThat(manutencao.estaConcluida()).isTrue();
    assertThat(manutencao.getConcluidaEm()).isEqualTo(LocalDate.parse("2026-09-08"));
    assertThat(manutencao.podeSerCorrigida()).isFalse();

    manutencao.reabrir(AGORA);
    assertThat(manutencao.estaConcluida()).isFalse();
    assertThat(manutencao.getConcluidaEm()).isNull();
    assertThat(manutencao.podeSerCorrigida()).isTrue();
  }

  @Test
  @DisplayName("responsável vazio vira nulo, não string em branco")
  void responsavelVazio() {
    Manutencao semResponsavel =
        new Manutencao(
            1L,
            new DadosDaManutencao(LocalDate.parse("2026-09-22"), null, "  ", "Boletim", null),
            AGORA);

    assertThat(semResponsavel.getResponsavel()).isNull();
    assertThat(semResponsavel.getHora()).isNull();
    assertThat(semResponsavel.getValor()).isNull();
  }

  @Test
  @DisplayName("o espaço não separável também sai das pontas e não vira responsável")
  void espacoNaoSeparavel() {
    Manutencao manutencao =
        new Manutencao(
            1L,
            new DadosDaManutencao(
                LocalDate.parse("2026-09-22"),
                null,
                ESPACO_NAO_SEPARAVEL + ESPACO_NAO_SEPARAVEL,
                ESPACO_NAO_SEPARAVEL + "Boletim" + ESPACO_DE_NUMERO,
                null),
            AGORA);

    assertThat(manutencao.getResponsavel()).isNull();
    assertThat(manutencao.getDescricao()).isEqualTo("Boletim");
  }

  @Test
  @DisplayName("programável de um ano atrás a dez anos à frente, com as duas pontas")
  void janelaDeProgramacao() {
    assertThat(programadaPara(HOJE.minusYears(1)).possuiDataProgramavel(HOJE)).isTrue();
    assertThat(programadaPara(HOJE.plusYears(10)).possuiDataProgramavel(HOJE)).isTrue();
    assertThat(programadaPara(HOJE.minusYears(1).minusDays(1)).possuiDataProgramavel(HOJE))
        .isFalse();
    assertThat(programadaPara(HOJE.plusYears(10).plusDays(1)).possuiDataProgramavel(HOJE))
        .isFalse();
    assertThat(programadaPara(LocalDate.of(1, 1, 1)).possuiDataProgramavel(HOJE)).isFalse();
  }

  @Test
  @DisplayName("a conclusão vem no máximo um ano antes da programada, e nunca antes de 2000")
  void janelaDaConclusao() {
    Manutencao manutencao = programadaPara(LocalDate.parse("2026-09-22"));

    assertThat(manutencao.primeiraDataDeConclusao()).isEqualTo(LocalDate.parse("2025-09-22"));
    assertThat(manutencao.aceitaConclusaoEm(LocalDate.parse("2025-09-22"))).isTrue();
    assertThat(manutencao.aceitaConclusaoEm(LocalDate.parse("2025-09-21"))).isFalse();
    assertThat(programadaPara(LocalDate.parse("2000-06-01")).primeiraDataDeConclusao())
        .isEqualTo(LocalDate.parse("2000-01-01"));
  }
}
