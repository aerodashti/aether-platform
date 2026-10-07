import type { UseMutationResult } from '@tanstack/react-query';
import { useState } from 'react';

import { ErroDeApi } from '@/api/cliente';

/** O 404 é o registro que outra pessoa já excluiu: a grade é relida, e a linha some. */
function jaFoiExcluido(erro: unknown): boolean {
  return erro instanceof ErroDeApi && erro.status === 404;
}

/** Por que a exclusão de "aporte de Ricardo Meirelles em 03/10/26" não aconteceu. */
export function mensagemDaFalhaAoExcluir(erro: unknown, descricao: string): string {
  if (jaFoiExcluido(erro)) {
    return `O ${descricao} já tinha sido excluído.`;
  }
  const motivo = erro instanceof Error ? ` ${erro.message}` : '';
  return `Não foi possível excluir o ${descricao}.${motivo}`;
}

/**
 * A exclusão com a confirmação na linha — "Excluir? Sim · Não" —, e a falha dita na grade: sem
 * ela, a confirmação fechava e a linha continuava lá sem explicação.
 */
export function useExclusaoNaGrade(
  excluir: UseMutationResult<unknown, Error, number>,
  aoExcluir?: (id: number) => void,
) {
  const [confirmando, setConfirmando] = useState<number | null>(null);
  const [falha, setFalha] = useState<string | null>(null);

  function pedir(id: number) {
    setFalha(null);
    setConfirmando(id);
  }

  function confirmar(id: number, descricao: string) {
    excluir.mutate(id, {
      onSuccess: () => aoExcluir?.(id),
      onError: (erro) => {
        // Excluído por outra pessoa, o registro também saiu: quem o corrigia precisa saber.
        if (jaFoiExcluido(erro)) {
          aoExcluir?.(id);
        }
        setFalha(mensagemDaFalhaAoExcluir(erro, descricao));
      },
      onSettled: () => setConfirmando(null),
    });
  }

  return {
    confirmando,
    falha,
    excluindo: excluir.isPending,
    pedir,
    confirmar,
    desistir: () => setConfirmando(null),
  };
}
