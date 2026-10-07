package br.com.aerodash.aether.aeronave;

import br.com.aerodash.aether.comum.erro.RecursoNaoEncontradoException;
import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import java.util.function.LongPredicate;

/**
 * O filtro por aeronave das listagens. Ausente é a frota toda; uma aeronave que não existe é 404,
 * porque a grade vazia diria "nada lançado". Cada decisão vai para o contexto com o nome da
 * listagem na frente.
 */
public final class FiltroPorAeronave {

  private FiltroPorAeronave() {}

  public static void exigirExistente(
      String listagem, Long aeronaveId, LongPredicate existe, ContextoDaRequisicao contexto) {
    boolean filtra = aeronaveId != null;
    contexto.decisao(listagem + ".filtroPorAeronave", filtra);
    if (!filtra) {
      return;
    }
    boolean encontrada = existe.test(aeronaveId);
    contexto.decisao(listagem + ".aeronaveDoFiltroExiste", encontrada);
    if (!encontrada) {
      throw new RecursoNaoEncontradoException("Aeronave não encontrada.");
    }
  }
}
