package br.com.aerodash.aether.manutencao;

import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import java.util.function.Supplier;

/**
 * A recusa de uma regra com a decisão registrada antes do desvio, como pede a observabilidade: a
 * linha canônica diz qual regra barrou o pedido sem ninguém ler o corpo da resposta.
 */
final class Recusa {

  private Recusa() {}

  static void recusarSe(
      ContextoDaRequisicao contexto,
      String decisao,
      boolean recusado,
      Supplier<? extends RuntimeException> recusa) {
    contexto.decisao(decisao, recusado);
    if (recusado) {
      throw recusa.get();
    }
  }
}
