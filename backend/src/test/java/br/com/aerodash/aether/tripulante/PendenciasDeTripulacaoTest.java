package br.com.aerodash.aether.tripulante;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import br.com.aerodash.aether.aeronave.Aeronave;
import br.com.aerodash.aether.aeronave.PendenciaOperacional;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
@DisplayName("Pendências de tripulação")
class PendenciasDeTripulacaoTest {

  private static final Instant AGORA = Instant.parse("2026-10-06T12:00:00Z");
  private static final LocalDate HOJE = LocalDate.of(2026, 10, 6);

  @Mock private TripulanteRepository tripulantes;

  private static Tripulante tripulante(String nome, LocalDate cht, SituacaoDoTripulante situacao) {
    return new Tripulante(
        1L,
        new DadosDoTripulante(
            nome,
            null,
            FuncaoDoTripulante.COPILOTO,
            HOJE.plusYears(1),
            cht,
            null,
            null,
            null,
            situacao),
        AGORA);
  }

  @Test
  @DisplayName("CHT vencido de tripulante ativo pede atenção, sem impedir o voo; inativo não conta")
  void soAtivoVencido() {
    Aeronave aeronave =
        new Aeronave("PS-MEP", "Citation", "SBSP", HOJE.plusYears(1), HOJE.plusYears(1), AGORA);
    ReflectionTestUtils.setField(aeronave, "id", 1L);
    when(tripulantes.findAll())
        .thenReturn(
            List.of(
                tripulante("Juliana Prates", HOJE.minusDays(38), SituacaoDoTripulante.ATIVO),
                tripulante("Sérgio Tanaka", HOJE.minusDays(90), SituacaoDoTripulante.INATIVO),
                tripulante("Marcos Vilela", HOJE.plusDays(96), SituacaoDoTripulante.ATIVO)));

    Map<Long, List<PendenciaOperacional>> pendencias =
        new PendenciasDeTripulacao(tripulantes).pendenciasDe(List.of(aeronave), HOJE, 30);

    assertThat(pendencias.get(1L))
        .singleElement()
        .satisfies(
            p -> {
              assertThat(p.descricao()).isEqualTo("CHT de Juliana Prates vencido");
              assertThat(p.impedeVoo()).isFalse();
            });
  }
}
