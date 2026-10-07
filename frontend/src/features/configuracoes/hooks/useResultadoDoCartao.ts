import { useState } from 'react';

import { ErroDeApi } from '@/api/cliente';

import type { Resultado } from '../componentes/ResultadoDoEnvio';

interface MutacaoDoCartao {
  isSuccess: boolean;
  error: unknown;
  reset: () => void;
}

/** A recusa que não aponta campo (403, 401, 500): não há campo cuja edição a apague. */
function recusaGeral(erro: unknown): boolean {
  return (
    erro instanceof Error && !(erro instanceof ErroDeApi && Object.keys(erro.campos).length > 0)
  );
}

/**
 * O que o cartão diz depois de "Salvar": que salvou, ou que não havia o que salvar. As duas frases
 * somem quando a pessoa volta a editar — "Dados salvos." sobre um campo já mudado seria mentira —,
 * e a recusa geral também: ela falava do envio anterior. A recusa de um campo fica com o
 * `useValidacao`, que a apaga quando aquele campo muda.
 *
 * <p>Sem mudança, o pedido nem sai: o botão continua clicável (ADR-0022) e explica por que não fez
 * nada, em vez de mandar ao servidor o que ele já tem.
 */
export function useResultadoDoCartao(mutacao: MutacaoDoCartao, mensagemDeSucesso: string) {
  const [semMudanca, setSemMudanca] = useState(false);

  function aoEditar() {
    setSemMudanca(false);
    if (mutacao.isSuccess || recusaGeral(mutacao.error)) {
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
