import type { AporteResponse, FiltroDoFundo, RendimentoResponse } from '../api/useAportes';

import { competenciaEmTexto, moedaEmTexto } from './rotulos';

/** Se a grade do recorte mostra o registro — vazio é sem limite daquele lado. */
function estaNoRecorte(
  aeronaveId: number | undefined,
  competencia: string | undefined,
  filtro: FiltroDoFundo,
): boolean {
  const mesmaAeronave = filtro.aeronaveId === '' || String(aeronaveId) === filtro.aeronaveId;
  const mes = competencia ?? '';
  const depoisDoInicio = filtro.de === '' || mes >= filtro.de;
  const antesDoFim = filtro.ate === '' || mes <= filtro.ate;
  return mesmaAeronave && depoisDoInicio && antesDoFim;
}

/** Sem isto, o registro fora do recorte some da tela como se não tivesse sido salvo. */
function avisoDoRecorte(estaNaGrade: boolean): string {
  return estaNaGrade ? '' : ' Ele não aparece na grade porque está fora do recorte selecionado.';
}

/** "Aporte de R$ 25.000,00 de Ricardo Meirelles registrado na PS-MEP, competência Set/26." */
export function confirmacaoDoAporte(
  aporte: AporteResponse,
  filtro: FiltroDoFundo,
  corrigido: boolean,
): string {
  const acao = corrigido ? 'corrigido' : 'registrado';
  return (
    `Aporte de ${moedaEmTexto(aporte.valor)} de ${aporte.nomeDoProprietario ?? ''} ${acao} na ` +
    `${aporte.matricula ?? ''}, competência ${competenciaEmTexto(aporte.competencia)}.` +
    avisoDoRecorte(estaNoRecorte(aporte.aeronaveId, aporte.competencia, filtro))
  );
}

/** "Rendimento de R$ 948,22 registrado na PS-MEP, competência Set/26." */
export function confirmacaoDoRendimento(
  rendimento: RendimentoResponse,
  filtro: FiltroDoFundo,
  corrigido: boolean,
): string {
  const acao = corrigido ? 'corrigido' : 'registrado';
  return (
    `Rendimento de ${moedaEmTexto(rendimento.valor)} ${acao} na ${rendimento.matricula ?? ''}, ` +
    `competência ${competenciaEmTexto(rendimento.competencia)}.` +
    avisoDoRecorte(estaNoRecorte(rendimento.aeronaveId, rendimento.competencia, filtro))
  );
}
