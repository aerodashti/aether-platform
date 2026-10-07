import { dataEntre, obrigatorio, primeiraFalha } from '@/compartilhado/formulario/regras';
import type { Erros } from '@/compartilhado/formulario/useValidacao';

import type { ConclusaoDaTrocaRequest } from '../api/useTrocas';

import { dataCompleta } from './rotulos';

export type CampoDaConclusao = keyof ConclusaoDaTrocaRequest;

export const ROTULOS_DA_CONCLUSAO: Record<CampoDaConclusao, string> = {
  concluidaEm: 'Data da devolução',
};

export interface ContextoDaConclusao {
  /** Hoje, no fuso de quem usa (`hojeLocal()`). */
  hoje: string;
  /** A devolução não vem antes da própria troca. */
  dataDaTroca: string;
}

/** A devolução já aconteceu: entre a data da troca e hoje, como o servidor confere (D9). */
export function validarConclusao(
  rascunho: ConclusaoDaTrocaRequest,
  { hoje, dataDaTroca }: ContextoDaConclusao,
): Erros<CampoDaConclusao> {
  return {
    concluidaEm: primeiraFalha(
      rascunho.concluidaEm,
      obrigatorio('Informe a data da devolução.'),
      dataEntre({
        minimo: dataDaTroca,
        maximo: hoje,
        mensagemDeMinimo: `A devolução não pode ser antes da troca, de ${dataCompleta(dataDaTroca)}.`,
        mensagemDeMaximo: 'A devolução já aconteceu: a data não pode ser futura.',
      }),
    ),
  };
}
