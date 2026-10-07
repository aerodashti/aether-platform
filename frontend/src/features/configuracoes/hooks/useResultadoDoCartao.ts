import { useState } from 'react';

import type { Resultado } from '../componentes/ResultadoDoEnvio';

interface MutacaoDoCartao {
  isSuccess: boolean;
  reset: () => void;
}

/**
 * O que o cartão diz depois de "Salvar": que salvou, ou que não havia o que salvar. As duas frases
 * somem quando a pessoa volta a editar — "Dados salvos." sobre um campo já mudado seria mentira.
 *
 * <p>Sem mudança, o pedido nem sai: o botão continua clicável (ADR-0022) e explica por que não fez
 * nada, em vez de mandar ao servidor o que ele já tem.
 */
export function useResultadoDoCartao(mutacao: MutacaoDoCartao, mensagemDeSucesso: string) {
  const [semMudanca, setSemMudanca] = useState(false);

  function aoEditar() {
    setSemMudanca(false);
    if (mutacao.isSuccess) {
      mutacao.reset();
    }
  }

  function salvarSeMudou(mudou: boolean, salvar: () => void) {
    setSemMudanca(!mudou);
    if (mudou) {
      salvar();
    }
  }

  let resultado: Resultado | undefined;
  if (mutacao.isSuccess) {
    resultado = { mensagem: mensagemDeSucesso, tom: 'positivo' };
  } else if (semMudanca) {
    resultado = { mensagem: 'Nenhuma alteração para salvar.', tom: 'suave' };
  }

  return { resultado, aoEditar, salvarSeMudou };
}
