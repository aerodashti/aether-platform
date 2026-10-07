import { numero, obrigatorio, primeiraFalha } from '@/compartilhado/formulario/regras';
import type { Erros } from '@/compartilhado/formulario/useValidacao';

import type {
  CampoDaConfiguracao,
  RascunhoDaConfiguracao,
} from './rascunhoDaConfiguracaoFinanceira';

/** O limite de NUMERIC(14,2), o mesmo do @Digits do ConfiguracaoFinanceiraRequest. */
const REAIS_MAXIMOS = 999_999_999_999.99;

export function validarConfiguracaoFinanceira(
  rascunho: RascunhoDaConfiguracao,
): Erros<CampoDaConfiguracao> {
  return {
    valorDoAporte:
      rascunho.modeloDeAporte === 'FIXO'
        ? primeiraFalha(
            rascunho.valorDoAporte,
            obrigatorio('Informe o valor de cada aporte.'),
            numero({ maiorQue: 0, maximo: REAIS_MAXIMOS, casas: 2 }),
          )
        : undefined,
    diaDeFechamento: primeiraFalha(
      rascunho.diaDeFechamento,
      obrigatorio('Informe o dia de fechamento.'),
      numero({ minimo: 1, maximo: 28, casas: 0 }),
    ),
    saldoDeAbertura: primeiraFalha(
      rascunho.saldoDeAbertura,
      obrigatorio('Informe o saldo do fundo no cadastro.'),
      numero({ minimo: -REAIS_MAXIMOS, maximo: REAIS_MAXIMOS, casas: 2 }),
    ),
  };
}
