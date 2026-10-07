import { dataEntre, obrigatorio, primeiraFalha } from '@/compartilhado/formulario/regras';
import type { Erros } from '@/compartilhado/formulario/useValidacao';

import type { ConclusaoRequest } from '../api/useManutencao';

import { anoDeQuatroDigitos, primeiraDataDeConclusao } from './datasDaManutencao';
import { dataCompleta } from './rotulos';

export type CampoDaConclusao = keyof ConclusaoRequest;

export const ROTULOS_DA_CONCLUSAO: Record<CampoDaConclusao, string> = {
  concluidaEm: 'Data da conclusão',
};

export interface ContextoDaConclusao {
  /** Hoje, no fuso de quem usa (`hojeLocal()`). */
  hoje: string;
  /** A data em que a manutenção foi programada. */
  dataProgramada: string;
}

/** A manutenção já foi feita: nunca no futuro, nem mais de um ano antes da programada (D9). */
export function validarConclusao(
  rascunho: ConclusaoRequest,
  { hoje, dataProgramada }: ContextoDaConclusao,
): Erros<CampoDaConclusao> {
  const minimo = primeiraDataDeConclusao(dataProgramada);
  return {
    concluidaEm: primeiraFalha(
      rascunho.concluidaEm,
      obrigatorio('Informe a data da conclusão.'),
      anoDeQuatroDigitos,
      dataEntre({
        minimo,
        maximo: hoje,
        mensagemDeMinimo: `Use uma data a partir de ${dataCompleta(minimo)}: a manutenção está programada para ${dataCompleta(dataProgramada)}.`,
        mensagemDeMaximo: 'A conclusão já aconteceu: a data não pode ser futura.',
      }),
    ),
  };
}
