package br.com.aerodash.aether.fechamento;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import br.com.aerodash.aether.aeronave.AeronaveRepository;
import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import java.time.Clock;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("ResumoDaFrotaService")
class ResumoDaFrotaServiceTest {

  @Mock private AeronaveRepository aeronaves;
  @Mock private LeitorDeMovimentos leitor;
  @Mock private ContextoDaRequisicao contexto;

  private ResumoDaFrotaService service;

  @BeforeEach
  void montar() {
    service =
        new ResumoDaFrotaService(
            aeronaves,
            leitor,
            Clock.fixed(Instant.parse("2026-10-07T12:00:00Z"), ZoneOffset.UTC),
            contexto);
  }

  @Test
  @DisplayName("competência fora da janela é recusada antes de ler a frota")
  void foraDaJanela() {
    assertThatThrownBy(() -> service.frota(YearMonth.of(9999, 12)))
        .isInstanceOf(FechamentoInvalidoException.class)
        .extracting(falha -> ((FechamentoInvalidoException) falha).getCampo())
        .isEqualTo(Optional.of("competencia"));
    verify(aeronaves, never()).findAllByOrderByMatriculaAsc();
  }

  @Test
  @DisplayName("sem competência, vale a corrente")
  void corrente() {
    assertThat(service.frota(null)).isEmpty();
    verify(contexto).decisao("frota.competenciaNaJanela", true);
    verify(contexto).decisao("frota.competenciaCorrente", true);
  }
}
