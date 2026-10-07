import { lerNumero, numeroParaCampo } from '@/compartilhado/formatacao/numero';

import type { CorpoDoTrecho, TrechoResponse } from '../api/useVoos';

import { horaLocal, type HorariosGravados, type Instantes } from './horarios';

/**
 * O formulário do trecho como a pessoa o preenche: tudo texto, e cada campo com o nome do JSON do
 * request — é assim que o `campos` de uma recusa do servidor cai no campo certo. Os horários são
 * "HH:MM" no fuso deste dispositivo; o instante só é montado para enviar.
 */
export interface RascunhoDoTrecho {
  aeronaveId: string;
  relatorioDeVoo: string;
  numeroDoTrecho: string;
  data: string;
  origem: string;
  destino: string;
  km: string;
  partidaPrevista: string;
  pousoPrevisto: string;
  partidaRealizada: string;
  pousoRealizado: string;
  proprietarioId: string;
  observacoes: string;
}

export type CampoDoTrecho = keyof RascunhoDoTrecho;

/** O rótulo de cada campo, o mesmo da tela: o resumo diz o que falta com o nome que a pessoa lê. */
export const ROTULOS_DO_TRECHO: Record<CampoDoTrecho, string> = {
  aeronaveId: 'Aeronave',
  relatorioDeVoo: 'Rel. Voo',
  numeroDoTrecho: 'Nº do trecho',
  data: 'Data do trecho',
  origem: 'Origem',
  destino: 'Destino',
  km: 'Distância (km)',
  partidaPrevista: 'Partida prevista',
  pousoPrevisto: 'Pouso previsto',
  partidaRealizada: 'Partida realizada',
  pousoRealizado: 'Pouso realizado',
  proprietarioId: 'Atribuição (quem usou)',
  observacoes: 'Observações',
};

function idEmTexto(id: number | undefined): string {
  return id == null ? '' : String(id);
}

/** O lançamento novo começa no trecho 1; a correção, no que está gravado, com a vírgula decimal. */
export function rascunhoInicial(trecho?: TrechoResponse, aeronaveInicial = ''): RascunhoDoTrecho {
  return {
    aeronaveId: idEmTexto(trecho?.aeronaveId) || aeronaveInicial,
    relatorioDeVoo: trecho?.relatorioDeVoo ?? '',
    numeroDoTrecho: String(trecho?.numeroDoTrecho ?? 1),
    data: trecho?.data ?? '',
    origem: trecho?.origem ?? '',
    destino: trecho?.destino ?? '',
    km: numeroParaCampo(trecho?.km),
    partidaPrevista: horaLocal(trecho?.partidaPrevista),
    pousoPrevisto: horaLocal(trecho?.pousoPrevisto),
    partidaRealizada: horaLocal(trecho?.partidaRealizada),
    pousoRealizado: horaLocal(trecho?.pousoRealizado),
    proprietarioId: idEmTexto(trecho?.proprietarioId),
    observacoes: trecho?.observacoes ?? '',
  };
}

/** Os instantes como estão gravados, para a correção não remontar o par que ninguém tocou. */
export function horariosGravados(trecho?: TrechoResponse): HorariosGravados | undefined {
  if (trecho?.data === undefined) {
    return undefined;
  }
  return {
    data: trecho.data,
    instantes: {
      partidaPrevista: trecho.partidaPrevista,
      pousoPrevisto: trecho.pousoPrevisto,
      partidaRealizada: trecho.partidaRealizada,
      pousoRealizado: trecho.pousoRealizado,
    },
  };
}

/**
 * O corpo do request, com os textos aparados — o servidor confere o formato do ICAO no valor que
 * recebe. Roda depois de `validarTrecho` aprovar: os números já são números.
 */
export function corpoDoTrecho(rascunho: RascunhoDoTrecho, instantes: Instantes): CorpoDoTrecho {
  return {
    aeronaveId: rascunho.aeronaveId === '' ? null : Number(rascunho.aeronaveId),
    relatorioDeVoo: rascunho.relatorioDeVoo.trim(),
    numeroDoTrecho: lerNumero(rascunho.numeroDoTrecho),
    data: rascunho.data,
    origem: rascunho.origem.trim(),
    destino: rascunho.destino.trim(),
    km: lerNumero(rascunho.km),
    partidaPrevista: instantes.partidaPrevista?.toISOString(),
    pousoPrevisto: instantes.pousoPrevisto?.toISOString(),
    partidaRealizada: instantes.partidaRealizada?.toISOString(),
    pousoRealizado: instantes.pousoRealizado?.toISOString(),
    proprietarioId: rascunho.proprietarioId === '' ? undefined : Number(rascunho.proprietarioId),
    observacoes: rascunho.observacoes,
  };
}
