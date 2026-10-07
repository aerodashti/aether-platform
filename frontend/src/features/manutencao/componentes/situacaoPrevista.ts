import { lerNumero } from '@/compartilhado/formatacao/numero';

import type { SituacaoDoParametro } from '../api/useManutencao';

import type { RascunhoDoParametro } from './rascunhoDoParametro';
import { numeroEmTexto, UNIDADE_DA_REGUA } from './rotulos';

/** Os contadores contra os quais o limite é julgado, como o painel da aeronave os traz. */
export interface ContadoresDaAeronave {
  horasDeCelula?: number;
  ciclos?: number;
}

const UM_DIA_EM_MS = 24 * 60 * 60 * 1000;

const CONSEQUENCIA: Record<Exclude<SituacaoDoParametro, 'REGULAR'>, string> = {
  ESTOURADO: 'O limite já passou: o parâmetro nasce estourado e a aeronave fica impedida de voar.',
  ATENCAO: 'Já está dentro da faixa de aviso: o parâmetro nasce em atenção.',
};

/** Datas ISO lidas em UTC dos dois lados: a diferença é de dias inteiros, sem horário de verão. */
function diasEntre(de: string, ate: string): number {
  return Math.round((Date.parse(ate) - Date.parse(de)) / UM_DIA_EM_MS);
}

function atualDaRegua(
  { tipo }: RascunhoDoParametro,
  contadores: ContadoresDaAeronave,
): number | undefined {
  if (tipo === 'DATA') {
    return undefined;
  }
  return tipo === 'HORAS' ? contadores.horasDeCelula : contadores.ciclos;
}

/** Quanto faltaria até o limite, na unidade da régua — a conta de `ParametroDeControle.restante`. */
function restantePrevisto(
  rascunho: RascunhoDoParametro,
  contadores: ContadoresDaAeronave,
  hoje: string,
): number | undefined {
  if (rascunho.tipo === 'DATA') {
    return /^\d{4}-\d{2}-\d{2}$/.test(rascunho.dataLimite)
      ? diasEntre(hoje, rascunho.dataLimite)
      : undefined;
  }
  const limite = lerNumero(rascunho.limite);
  const atual = atualDaRegua(rascunho, contadores);
  return limite === null || atual === undefined ? undefined : limite - atual;
}

/**
 * A situação com que o parâmetro nasceria, pela regra do servidor: negativo é estouro, e dentro da
 * faixa de aviso é atenção. `undefined` enquanto o rascunho não permite a conta.
 */
export function situacaoPrevista(
  rascunho: RascunhoDoParametro,
  contadores: ContadoresDaAeronave,
  hoje: string,
): SituacaoDoParametro | undefined {
  const restante = restantePrevisto(rascunho, contadores, hoje);
  if (restante === undefined) {
    return undefined;
  }
  if (restante < 0) {
    return 'ESTOURADO';
  }
  const aviso = lerNumero(rascunho.aviso);
  if (aviso === null) {
    return undefined;
  }
  return restante <= aviso ? 'ATENCAO' : 'REGULAR';
}

function referenciaDeHoje(
  rascunho: RascunhoDoParametro,
  contadores: ContadoresDaAeronave,
): string | undefined {
  const atual = atualDaRegua(rascunho, contadores);
  return atual === undefined
    ? undefined
    : `A aeronave está com ${numeroEmTexto(atual)} ${UNIDADE_DA_REGUA[rascunho.tipo]}.`;
}

function previsao(
  rascunho: RascunhoDoParametro,
  contadores: ContadoresDaAeronave,
  hoje: string,
): string | undefined {
  const restante = restantePrevisto(rascunho, contadores, hoje);
  if (restante === undefined) {
    return undefined;
  }
  if (restante < 0) {
    return CONSEQUENCIA.ESTOURADO;
  }
  const falta = `Faltam ${numeroEmTexto(restante)} ${UNIDADE_DA_REGUA[rascunho.tipo]}.`;
  return situacaoPrevista(rascunho, contadores, hoje) === 'ATENCAO'
    ? `${falta} ${CONSEQUENCIA.ATENCAO}`
    : falta;
}

/**
 * O apoio do limite: o contador de hoje (que o modal cobre na página), quanto falta — prova de que
 * "4.000" foi lido como quatro mil — e a consequência, antes de salvar, de nascer estourado ou em
 * atenção.
 */
export function apoioDoLimite(
  rascunho: RascunhoDoParametro,
  contadores: ContadoresDaAeronave,
  hoje: string,
): string | undefined {
  const frases = [referenciaDeHoje(rascunho, contadores), previsao(rascunho, contadores, hoje)];
  return frases.filter(Boolean).join(' ') || undefined;
}
