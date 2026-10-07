package br.com.aerodash.aether.voo;

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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** O filtro do diário: a mesma checagem de aeronave das outras listagens. */
@ExtendWith(MockitoExtension.class)
@DisplayName("VooService — filtro do diário")
class VooServiceListagemTest {

  @Mock private TrechoRepository trechos;
  @Mock private AeronaveRepository aeronaves;
  @Mock private ProprietarioRepository proprietarios;
  @Mock private ParticipantesDoVoo participantes;
  @Mock private ContextoDaRequisicao contexto;

  private VooService service;

  @BeforeEach
  void montar() {
    service =
        new VooService(
            trechos,
            aeronaves,
            proprietarios,
            new ValidacaoDoTrecho(proprietarios, participantes, contexto),
            Clock.fixed(Instant.parse("2026-09-10T12:00:00Z"), ZoneOffset.UTC),
            contexto);
  }

  @Test
  @DisplayName("filtrar por uma aeronave que não existe é 404, não um diário vazio")
  void filtroPorAeronaveInexistente() {
    assertThatThrownBy(() -> service.listar(99L, YearMonth.parse("2026-09")))
        .isInstanceOf(RecursoNaoEncontradoException.class)
        .hasMessage("Aeronave não encontrada.");
    verify(contexto).decisao("voos.aeronaveDoFiltroExiste", false);
    verify(trechos, never())
        .findByAeronaveIdAndDataBetweenOrderByDataDescRelatorioDeVooDescNumeroDoTrechoDesc(
            any(), any(), any());
  }
}
