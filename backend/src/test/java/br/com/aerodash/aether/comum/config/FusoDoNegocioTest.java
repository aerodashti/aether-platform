package br.com.aerodash.aether.comum.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("FusoDoNegocio")
class FusoDoNegocioTest {

  @Test
  @DisplayName("às 23h30 em Brasília, o relógio UTC já virou o dia, e o negócio ainda não")
  void hojeEhODeBrasilia() {
    Instant noiteEmBrasilia = Instant.parse("2026-10-08T02:30:00Z");

    assertThat(FusoDoNegocio.hoje(Clock.fixed(noiteEmBrasilia, ZoneOffset.UTC)))
        .isEqualTo(LocalDate.parse("2026-10-07"));
    assertThat(FusoDoNegocio.dataDe(Instant.parse("2026-10-08T03:00:00Z")))
        .isEqualTo(LocalDate.parse("2026-10-08"));
  }
}
