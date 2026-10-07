package br.com.aerodash.aether.aeronave;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;

import br.com.aerodash.aether.comum.erro.RecursoNaoEncontradoException;
import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("FiltroPorAeronave")
class FiltroPorAeronaveTest {

  @Mock private ContextoDaRequisicao contexto;

  @Test
  @DisplayName("a aeronave do filtro que não existe é 404")
  void inexistente() {
    assertThatThrownBy(
            () -> FiltroPorAeronave.exigirExistente("aportes", 99L, id -> false, contexto))
        .isInstanceOf(RecursoNaoEncontradoException.class)
        .hasMessage("Aeronave não encontrada.");
    verify(contexto).decisao("aportes.filtroPorAeronave", true);
    verify(contexto).decisao("aportes.aeronaveDoFiltroExiste", false);
  }

  @Test
  @DisplayName("sem filtro, nem se consulta")
  void semFiltro() {
    FiltroPorAeronave.exigirExistente(
        "custos",
        null,
        id -> {
          throw new AssertionError("sem filtro não se consulta");
        },
        contexto);
    verify(contexto).decisao("custos.filtroPorAeronave", false);
  }
}
