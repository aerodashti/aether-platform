import { somarMeses } from '@/compartilhado/formatacao/datas';
import {
  dataEntre,
  numero,
  obrigatorio,
  primeiraFalha,
  tamanhoMaximo,
  type Regra,
} from '@/compartilhado/formulario/regras';
import type { Erros } from '@/compartilhado/formulario/useValidacao';

import type { Instantes } from './horarios';
import type { CampoDoTrecho, RascunhoDoTrecho } from './rascunhoDoTrecho';

/**
 * Os limites do `TrechoRequest` e da entidade `Trecho` no backend — um limite muda nos dois lugares,
 * e a coluna o confirma.
 */
export const LIMITES_DO_TRECHO = {
  relatorioDeVoo: 20,
  observacoes: 500,
  /** NUMERIC(8,1). */
  kmMaximo: 9_999_999.9,
  /** INTEGER. */
  numeroMaximo: 2_147_483_647,
  /** A primeira data de um trecho realizado (decisão de produto D1). */
  primeiraData: '2000-01-01',
  /** O relógio de bordo e o do servidor não batem ao segundo (D1). */
  folgaDoRelogioEmMinutos: 15,
} as const;

const MILISSEGUNDOS_POR_MINUTO = 60 * 1000;
const CODIGO_ICAO = /^[A-Za-z]{4}$/;
/** O campo nativo aceita digitar um ano de cinco dígitos, e "20266-01-01" passaria na comparação. */
const DATA_COMPLETA = /^\d{4}-\d{2}-\d{2}$/;

export interface MomentoDaValidacao {
  /** Hoje, "AAAA-MM-DD", no fuso deste dispositivo. */
  hoje: string;
  /** Agora, em milissegundos. */
  agora: number;
  /** Na correção, a data gravada: a janela só julga a data que mudou, como o servidor. */
  dataGravada?: string;
}

/** Com o par realizado completo, o trecho voou: soma nos contadores e a data é de um fato. */
export function estaRealizado(
  rascunho: Pick<RascunhoDoTrecho, 'partidaRealizada' | 'pousoRealizado'>,
): boolean {
  return rascunho.partidaRealizada !== '' && rascunho.pousoRealizado !== '';
}

/**
 * As datas aceitas: o realizado é fato, de 2000 até hoje (D1); o planejado vai de um ano para trás
 * — o registro tardio — a dez anos à frente (D2).
 */
export function janelaDaData(realizado: boolean, hoje: string): { minimo: string; maximo: string } {
  return realizado
    ? { minimo: LIMITES_DO_TRECHO.primeiraData, maximo: hoje }
    : { minimo: somarMeses(hoje, -12), maximo: somarMeses(hoje, 120) };
}

const codigoIcao: Regra = (texto) =>
  texto.trim() === '' || CODIGO_ICAO.test(texto.trim())
    ? undefined
    : 'Use o código ICAO de 4 letras, como SBSP.';

const dataCompleta: Regra = (texto) =>
  texto === '' || DATA_COMPLETA.test(texto) ? undefined : 'Use uma data com o ano de 4 dígitos.';

function regraDaJanela(rascunho: RascunhoDoTrecho, momento: MomentoDaValidacao): Regra {
  if (rascunho.data === momento.dataGravada) {
    return () => undefined;
  }
  const realizado = estaRealizado(rascunho);
  const { minimo, maximo } = janelaDaData(realizado, momento.hoje);
  return dataEntre({
    minimo,
    maximo,
    mensagemDeMaximo: realizado ? 'Um trecho já realizado não tem data futura.' : undefined,
  });
}

function mesmoHorario(partida: string, pouso: string): string | undefined {
  return partida !== '' && partida === pouso
    ? 'O pouso não pode ser no mesmo horário da partida.'
    : undefined;
}

function erroDaPartidaRealizada(rascunho: RascunhoDoTrecho): string | undefined {
  return rascunho.partidaRealizada === '' && rascunho.pousoRealizado !== ''
    ? 'Informe também a partida realizada.'
    : undefined;
}

function erroDoPousoRealizado(
  rascunho: RascunhoDoTrecho,
  momento: MomentoDaValidacao,
  pouso: Date | undefined,
): string | undefined {
  if (rascunho.pousoRealizado === '') {
    return rascunho.partidaRealizada === '' ? undefined : 'Informe também o pouso realizado.';
  }
  const limite =
    momento.agora + LIMITES_DO_TRECHO.folgaDoRelogioEmMinutos * MILISSEGUNDOS_POR_MINUTO;
  return (
    mesmoHorario(rascunho.partidaRealizada, rascunho.pousoRealizado) ??
    (pouso !== undefined && pouso.getTime() > limite
      ? 'O pouso realizado não pode estar no futuro.'
      : undefined)
  );
}

/**
 * Os problemas do trecho agora, campo a campo, com os limites do servidor. `instantes` são os que
 * o painel vai enviar — o pouso realizado no futuro é julgado no instante, não na hora digitada.
 */
export function validarTrecho(
  rascunho: RascunhoDoTrecho,
  momento: MomentoDaValidacao,
  instantes: Instantes,
): Erros<CampoDoTrecho> {
  return {
    aeronaveId: primeiraFalha(rascunho.aeronaveId, obrigatorio('Escolha a aeronave.')),
    relatorioDeVoo: primeiraFalha(
      rascunho.relatorioDeVoo,
      obrigatorio('Informe o Rel. Voo.'),
      tamanhoMaximo(LIMITES_DO_TRECHO.relatorioDeVoo),
    ),
    numeroDoTrecho: primeiraFalha(
      rascunho.numeroDoTrecho,
      obrigatorio('Informe o nº do trecho.'),
      numero({ minimo: 1, maximo: LIMITES_DO_TRECHO.numeroMaximo, casas: 0 }),
    ),
    data: primeiraFalha(
      rascunho.data,
      obrigatorio('Informe a data do trecho.'),
      dataCompleta,
      regraDaJanela(rascunho, momento),
    ),
    origem: primeiraFalha(rascunho.origem, obrigatorio('Informe a origem.'), codigoIcao),
    destino: primeiraFalha(rascunho.destino, obrigatorio('Informe o destino.'), codigoIcao),
    km: primeiraFalha(
      rascunho.km,
      obrigatorio('Informe a distância.'),
      numero({ maiorQue: 0, maximo: LIMITES_DO_TRECHO.kmMaximo, casas: 1 }),
    ),
    pousoPrevisto: mesmoHorario(rascunho.partidaPrevista, rascunho.pousoPrevisto),
    partidaRealizada: erroDaPartidaRealizada(rascunho),
    pousoRealizado: erroDoPousoRealizado(rascunho, momento, instantes.pousoRealizado),
    observacoes: primeiraFalha(rascunho.observacoes, tamanhoMaximo(LIMITES_DO_TRECHO.observacoes)),
  };
}
