import { numeroParaCampo } from '@/compartilhado/formatacao/numero';

import type {
  BaseDoRateio,
  ConfiguracaoFinanceiraRequest,
  DetalheDaAeronaveResponse,
  ModeloDeAporte,
} from '../api/useDetalheDaAeronave';

import { numeroValidado } from './numerosDoRascunho';

/** Os campos da configuração, com o nome do JSON do request. */
export type CampoDaConfiguracao =
  | 'baseDoRateio'
  | 'modeloDeAporte'
  | 'periodicidadeDoAporteMeses'
  | 'valorDoAporte'
  | 'diaDeFechamento'
  | 'saldoDeAbertura';

export interface RascunhoDaConfiguracao {
  baseDoRateio: BaseDoRateio;
  modeloDeAporte: ModeloDeAporte;
  periodicidadeDoAporteMeses: string;
  valorDoAporte: string;
  diaDeFechamento: string;
  saldoDeAbertura: string;
}

export const ROTULOS_DA_CONFIGURACAO: Record<CampoDaConfiguracao, string> = {
  baseDoRateio: 'Base do rateio',
  modeloDeAporte: 'Modelo de aporte',
  periodicidadeDoAporteMeses: 'Periodicidade do aporte',
  valorDoAporte: 'Valor do aporte (R$)',
  diaDeFechamento: 'Dia de fechamento da fatura',
  saldoDeAbertura: 'Saldo do fundo no cadastro (R$)',
};

export function rascunhoDaConfiguracao(detalhe: DetalheDaAeronaveResponse): RascunhoDaConfiguracao {
  const financeiro = detalhe.configuracaoFinanceira;
  return {
    baseDoRateio: financeiro?.baseDoRateio ?? 'POR_USO',
    modeloDeAporte: financeiro?.modeloDeAporte ?? 'FIXO',
    periodicidadeDoAporteMeses: String(financeiro?.periodicidadeDoAporteMeses ?? 1),
    valorDoAporte: numeroParaCampo(financeiro?.valorDoAporte),
    diaDeFechamento: String(financeiro?.diaDeFechamento ?? 1),
    saldoDeAbertura: numeroParaCampo(financeiro?.saldoDeAbertura ?? 0),
  };
}

/**
 * A configuração para o PUT. O valor do aporte só existe no aporte fixo: no proporcional ao uso o
 * campo some da tela e não é enviado. Só depois de `validarConfiguracaoFinanceira` aprovar.
 */
export function configuracaoParaEnvio(
  rascunho: RascunhoDaConfiguracao,
): ConfiguracaoFinanceiraRequest {
  return {
    baseDoRateio: rascunho.baseDoRateio,
    modeloDeAporte: rascunho.modeloDeAporte,
    periodicidadeDoAporteMeses: Number(rascunho.periodicidadeDoAporteMeses),
    valorDoAporte:
      rascunho.modeloDeAporte === 'FIXO' ? numeroValidado(rascunho.valorDoAporte) : undefined,
    diaDeFechamento: numeroValidado(rascunho.diaDeFechamento),
    saldoDeAbertura: numeroValidado(rascunho.saldoDeAbertura),
  };
}
