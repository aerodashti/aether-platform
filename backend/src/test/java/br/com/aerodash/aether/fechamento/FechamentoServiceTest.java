package br.com.aerodash.aether.fechamento;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import br.com.aerodash.aether.aeronave.AeronaveRepository;
import br.com.aerodash.aether.comum.erro.RecursoNaoEncontradoException;
import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import br.com.aerodash.aether.proprietario.ProprietarioRepository;
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
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("FechamentoService")
class FechamentoServiceTest {

  @Mock private AeronaveRepository aeronaves;
  @Mock private ProprietarioRepository proprietarios;
  @Mock private LeitorDeMovimentos leitor;
  @Mock private ContextoDaRequisicao contexto;

  private FechamentoService service;

  @BeforeEach
  void montar() {
    service =
        new FechamentoService(
            aeronaves,
            proprietarios,
            leitor,
            Clock.fixed(Instant.parse("2026-10-07T12:00:00Z"), ZoneOffset.UTC),
            contexto);
  }

  @Test
  @DisplayName("a competência além de doze meses à frente é recusada antes de apurar")
  void competenciaForaDaJanela() {
    assertThatThrownBy(() -> service.mensal(1L, YearMonth.of(9999, 12)))
        .isInstanceOf(FechamentoInvalidoException.class)
        .hasMessage("Use uma competência de 01/2000 até 10/2027.")
        .extracting(falha -> ((FechamentoInvalidoException) falha).getCampo())
        .isEqualTo(Optional.of("competencia"));
    verify(contexto).decisao("fechamento.competenciaNaJanela", false);
    verify(leitor, never()).ler(any());
  }

  @Test
  @DisplayName("dentro da janela, segue para a aeronave")
  void competenciaNaJanela() {
    assertThatThrownBy(() -> service.mensal(1L, YearMonth.of(2027, 10)))
        .isInstanceOf(RecursoNaoEncontradoException.class);
    verify(contexto).decisao("fechamento.competenciaNaJanela", true);
  }

  @Test
  @DisplayName("o período recusa cada ponta no parâmetro dela")
  void periodo() {
    assertThatThrownBy(() -> service.periodo(1L, YearMonth.of(1999, 12), YearMonth.of(2026, 1)))
        .extracting(falha -> ((FechamentoInvalidoException) falha).getCampo())
        .isEqualTo(Optional.of("de"));
    assertThatThrownBy(() -> service.periodo(1L, YearMonth.of(2026, 9), YearMonth.of(2026, 1)))
        .hasMessage("A competência inicial vem depois da final.")
        .extracting(falha -> ((FechamentoInvalidoException) falha).getCampo())
        .isEqualTo(Optional.of("de"));
    assertThatThrownBy(() -> service.periodo(1L, YearMonth.of(2016, 1), YearMonth.of(2026, 1)))
        .hasMessage("O período vai até dez anos.")
        .extracting(falha -> ((FechamentoInvalidoException) falha).getCampo())
        .isEqualTo(Optional.of("ate"));
    verify(leitor, never()).ler(any());
  }
}
