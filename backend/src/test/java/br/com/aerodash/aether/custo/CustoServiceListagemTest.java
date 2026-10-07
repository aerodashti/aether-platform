package br.com.aerodash.aether.custo;

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
import java.time.ZoneOffset;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** O filtro dos lançamentos: a mesma checagem de aeronave das outras listagens. */
@ExtendWith(MockitoExtension.class)
@DisplayName("CustoService — filtro dos lançamentos")
class CustoServiceListagemTest {

  @Mock private CustoRepository custos;
  @Mock private AeronaveRepository aeronaves;
  @Mock private ProprietarioRepository proprietarios;
  @Mock private ParticipantesDoCusto participantes;
  @Mock private ContextoDaRequisicao contexto;

  private CustoService service;

  @BeforeEach
  void montar() {
    service =
        new CustoService(
            custos,
            aeronaves,
            proprietarios,
            participantes,
            Clock.fixed(Instant.parse("2026-09-10T12:00:00Z"), ZoneOffset.UTC),
            contexto);
  }

  @Test
  @DisplayName("filtrar por uma aeronave que não existe é 404, não uma grade vazia")
  void filtroPorAeronaveInexistente() {
    assertThatThrownBy(() -> service.listar(99L, null))
        .isInstanceOf(RecursoNaoEncontradoException.class)
        .hasMessage("Aeronave não encontrada.");
    verify(contexto).decisao("custos.aeronaveDoFiltroExiste", false);
    verify(custos, never()).findByAeronaveIdOrderByDataDescIdDesc(any());
  }
}
