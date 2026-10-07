import { lerNumero, numeroParaCampo } from '@/compartilhado/formatacao/numero';

import type { ParametroRequest, ParametroResponse, TipoDeParametro } from '../api/useManutencao';

/** O parâmetro como a pessoa o preenche, com os nomes do JSON do request. */
export interface RascunhoDoParametro {
  nome: string;
  tipo: TipoDeParametro;
  limite: string;
  dataLimite: string;
  aviso: string;
}

/**
 * Vazio, em horas, para criar; para editar, como foi gravado. O limite de um parâmetro de data vem
 * `null` do servidor e vira campo vazio — nunca o texto "null".
 */
export function rascunhoInicial(parametro?: ParametroResponse): RascunhoDoParametro {
  return {
    nome: parametro?.nome ?? '',
    tipo: parametro?.tipo ?? 'HORAS',
    limite: numeroParaCampo(parametro?.limite),
    dataLimite: parametro?.dataLimite ?? '',
    aviso: numeroParaCampo(parametro?.aviso),
  };
}

/**
 * Outra régua muda a unidade: 30 dias não são 30 horas. O limite e a faixa de aviso recomeçam
 * vazios, em vez de mudarem de sentido em silêncio.
 */
export function trocarRegua(rascunho: RascunhoDoParametro, tipo: TipoDeParametro) {
  return tipo === rascunho.tipo
    ? rascunho
    : { ...rascunho, tipo, limite: '', dataLimite: '', aviso: '' };
}

/** O corpo do request, ou `undefined` se um número não converte — o que a validação já barrou. */
export function corpoDoParametro(
  rascunho: RascunhoDoParametro,
  aeronaveId: number,
): ParametroRequest | undefined {
  const porData = rascunho.tipo === 'DATA';
  const limite = porData ? undefined : lerNumero(rascunho.limite);
  const aviso = lerNumero(rascunho.aviso);
  if (limite === null || aviso === null) {
    return undefined;
  }
  return {
    aeronaveId,
    nome: rascunho.nome.trim(),
    tipo: rascunho.tipo,
    limite,
    dataLimite: porData ? rascunho.dataLimite : undefined,
    aviso,
  };
}
