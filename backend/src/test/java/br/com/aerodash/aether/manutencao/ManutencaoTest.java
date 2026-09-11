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

  @Test
  @DisplayName("nasce programada; concluir e reabrir andam nos dois sentidos")
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
    assertThat(manutencao.getResponsavel()).isEqualTo("Hangar Líder");
    assertThat(manutencao.getDescricao()).isEqualTo("Inspeção de 100 h");

    manutencao.concluir(AGORA);
    assertThat(manutencao.estaConcluida()).isTrue();

    manutencao.reabrir(AGORA);
    assertThat(manutencao.estaConcluida()).isFalse();
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
}
