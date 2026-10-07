import type { VinculoVigenteResponse } from '@/compartilhado/participacoes/useVinculosVigentes';

import type { TipoDeCusto } from '../api/useCustos';

import type { SituacaoDaLista } from './opcoesDoCusto';

interface EntradaDoApoioDaAtribuicao {
  donos: SituacaoDaLista;
  aeronaveId: string;
  matricula: string | undefined;
  vinculos: VinculoVigenteResponse[] | undefined;
}

/**
 * O que a lista da Atribuição significa agora: por que só há o rateio, ou o que acontece com o
 * custo atribuído. A lista é a dos donos de hoje, qualquer que seja a data do custo — e o servidor
 * aceita quem já participou da aeronave em qualquer contrato.
 */
export function apoioDaAtribuicao({
  donos,
  aeronaveId,
  matricula,
  vinculos,
}: EntradaDoApoioDaAtribuicao): string {
  if (donos === 'carregando') {
    return 'Carregando os proprietários…';
  }
  if (donos === 'falhou') {
    return 'Não foi possível carregar os proprietários.';
  }
  if (aeronaveId === '') {
    return 'Escolha a aeronave para ver os proprietários dela.';
  }
  const possuiContratoVigente = (vinculos ?? []).some(
    (vinculo) => String(vinculo.aeronaveId) === aeronaveId,
  );
  if (!possuiContratoVigente) {
    return `${matricula ?? 'A aeronave'} não tem contrato vigente: o custo não será rateado até haver proprietários.`;
  }
  return 'A lista traz os donos de hoje. Atribuído, o custo vai inteiro para quem for escolhido, qualquer que seja a data.';
}

/** O vínculo com o voo só muda o rateio do custo variável; no fixo, é referência. */
export function apoioDoRelatorioDeVoo(tipo: TipoDeCusto): string {
  return tipo === 'VARIAVEL'
    ? 'Rateado, o custo variável segue as horas deste voo. Use o código do diário de voos.'
    : 'Só para consulta: o custo fixo é rateado pelo percentual do contrato.';
}
