import { lerNumero, numeroParaCampo } from '@/compartilhado/formatacao/numero';

import type { ManutencaoRequest, ManutencaoResponse } from '../api/useManutencao';

import { horaCurta } from './rotulos';

/**
 * A manutenção como a pessoa a preenche: texto em tudo e os nomes do JSON do request, para que o
 * `campos` de um 400 caia no campo certo.
 */
export interface RascunhoDaManutencao {
  data: string;
  hora: string;
  responsavel: string;
  descricao: string;
  valor: string;
}

/**
 * Vazia, para agendar; para corrigir, a manutenção como foi gravada. O servidor manda `null` no
 * opcional ausente, e ele vira campo vazio — nunca o texto "null".
 */
export function rascunhoInicial(manutencao?: ManutencaoResponse): RascunhoDaManutencao {
  return {
    data: manutencao?.data ?? '',
    hora: horaCurta(manutencao?.hora ?? undefined),
    responsavel: manutencao?.responsavel ?? '',
    descricao: manutencao?.descricao ?? '',
    valor: numeroParaCampo(manutencao?.valor),
  };
}

/**
 * O corpo do request, ou `undefined` se o valor não converte — o que a validação já barrou. Nunca
 * sai `NaN`: no JSON ele vira `null`, e a correção apagaria em silêncio o valor gravado.
 */
export function corpoDaManutencao(
  rascunho: RascunhoDaManutencao,
  aeronaveId: number,
): ManutencaoRequest | undefined {
  const valor = rascunho.valor.trim() === '' ? undefined : lerNumero(rascunho.valor);
  if (valor === null) {
    return undefined;
  }
  return {
    aeronaveId,
    data: rascunho.data,
    hora: rascunho.hora || undefined,
    responsavel: rascunho.responsavel.trim() || undefined,
    descricao: rascunho.descricao.trim(),
    valor,
  };
}
