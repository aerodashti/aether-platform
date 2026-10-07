import { lerNumero, numeroParaCampo } from '@/compartilhado/formatacao/numero';

import type { TrocaRequest, TrocaResponse } from '../api/useTrocas';

/**
 * A troca como a pessoa a preenche: texto em tudo e os nomes do JSON do request, para que o
 * `campos` de um 400 caia no campo certo.
 */
export interface RascunhoDaTroca {
  aeronaveId: string;
  data: string;
  cedenteId: string;
  recebedorId: string;
  horas: string;
  km: string;
  valorPorHora: string;
  relatorioDeVoo: string;
  observacao: string;
}

function idParaCampo(id: number | null | undefined): string {
  return id == null ? '' : String(id);
}

/** Vazia, com a data de hoje, para registrar; para corrigir, a troca como foi gravada. */
export function rascunhoInicial(troca: TrocaResponse | undefined, hoje: string): RascunhoDaTroca {
  return {
    aeronaveId: idParaCampo(troca?.aeronaveId),
    data: troca?.data ?? hoje,
    cedenteId: idParaCampo(troca?.cedenteId),
    recebedorId: idParaCampo(troca?.recebedorId),
    horas: numeroParaCampo(troca?.horas),
    km: numeroParaCampo(troca?.km),
    valorPorHora: numeroParaCampo(troca?.valorPorHora),
    relatorioDeVoo: troca?.relatorioDeVoo ?? '',
    observacao: troca?.observacao ?? '',
  };
}

/** Vazio é "sem valor"; texto que não é número é `null` — a validação já o barrou. */
function numeroOpcional(texto: string): number | undefined | null {
  return texto.trim() === '' ? undefined : lerNumero(texto);
}

/**
 * O corpo do request, ou `undefined` se o rascunho não converte — o que a validação já barrou
 * antes. Nunca sai `NaN`: no JSON ele vira `null`, e o PUT apagaria em silêncio o KM ou o R$/hora
 * já gravados.
 */
export function corpoDaTroca(rascunho: RascunhoDaTroca): TrocaRequest | undefined {
  const horas = lerNumero(rascunho.horas);
  const km = numeroOpcional(rascunho.km);
  const valorPorHora = numeroOpcional(rascunho.valorPorHora);
  const idsPreenchidos = [rascunho.aeronaveId, rascunho.cedenteId, rascunho.recebedorId].every(
    (id) => id !== '',
  );
  if (!idsPreenchidos || horas === null || km === null || valorPorHora === null) {
    return undefined;
  }
  return {
    aeronaveId: Number(rascunho.aeronaveId),
    data: rascunho.data,
    cedenteId: Number(rascunho.cedenteId),
    recebedorId: Number(rascunho.recebedorId),
    horas,
    km,
    valorPorHora,
    relatorioDeVoo: rascunho.relatorioDeVoo.trim() || undefined,
    observacao: rascunho.observacao.trim() || undefined,
  };
}
