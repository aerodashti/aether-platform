import { somarMesesNaCompetencia } from '@/compartilhado/formatacao/datas';
import { lerNumero, numeroParaCampo } from '@/compartilhado/formatacao/numero';

import type { AporteRequest, AporteResponse } from '../api/useAportes';

/**
 * O aporte como a pessoa o preenche: texto em tudo e os nomes do JSON do request, para que o
 * `campos` de um 400 caia no campo certo.
 */
export interface RascunhoDoAporte {
  aeronaveId: string;
  proprietarioId: string;
  data: string;
  competencia: string;
  valor: string;
}

function idParaCampo(id: number | undefined): string {
  return id == null ? '' : String(id);
}

/**
 * O aporte de setembro cai em outubro: a competência padrão é o mês anterior ao do crédito. Data
 * incompleta não tem mês, e a competência fica para a pessoa.
 */
export function competenciaPadrao(data: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(data) ? somarMesesNaCompetencia(data.slice(0, 7), -1) : '';
}

/** Para registrar, o crédito de hoje e a competência anterior; para corrigir, o aporte gravado. */
export function rascunhoInicial(
  aporte: AporteResponse | undefined,
  aeronaveInicial: string | undefined,
  hoje: string,
): RascunhoDoAporte {
  if (aporte) {
    return {
      aeronaveId: idParaCampo(aporte.aeronaveId),
      proprietarioId: idParaCampo(aporte.proprietarioId),
      data: aporte.data ?? '',
      competencia: aporte.competencia ?? '',
      valor: numeroParaCampo(aporte.valor),
    };
  }
  return {
    aeronaveId: aeronaveInicial ?? '',
    proprietarioId: '',
    data: hoje,
    competencia: competenciaPadrao(hoje),
    valor: '',
  };
}

/**
 * O corpo do request, ou `undefined` se o rascunho não converte — o que a validação já barrou
 * antes. Nunca sai `NaN`: no JSON ele vira `null`.
 */
export function corpoDoAporte(rascunho: RascunhoDoAporte): AporteRequest | undefined {
  const valor = lerNumero(rascunho.valor);
  if (rascunho.aeronaveId === '' || rascunho.proprietarioId === '' || valor === null) {
    return undefined;
  }
  return {
    aeronaveId: Number(rascunho.aeronaveId),
    proprietarioId: Number(rascunho.proprietarioId),
    data: rascunho.data,
    competencia: rascunho.competencia,
    valor,
  };
}
