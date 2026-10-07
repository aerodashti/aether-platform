import { obrigatorio, primeiraFalha } from '@/compartilhado/formulario/regras';
import type { Erros } from '@/compartilhado/formulario/useValidacao';

import type {
  CampoDaConfiguracao,
  RascunhoDaConfiguracao,
} from './rascunhoDaConfiguracaoFinanceira';
import { DIA_DE_FECHAMENTO, SALDO, VALOR_DO_APORTE } from './regrasDaAeronave';

export function validarConfiguracaoFinanceira(
  rascunho: RascunhoDaConfiguracao,
): Erros<CampoDaConfiguracao> {
  return {
    valorDoAporte:
      rascunho.modeloDeAporte === 'FIXO'
        ? primeiraFalha(
            rascunho.valorDoAporte,
            obrigatorio('Informe o valor de cada aporte.'),
            VALOR_DO_APORTE,
          )
        : undefined,
    diaDeFechamento: primeiraFalha(
      rascunho.diaDeFechamento,
      obrigatorio('Informe o dia de fechamento.'),
      DIA_DE_FECHAMENTO,
    ),
    saldoDeAbertura: primeiraFalha(
      rascunho.saldoDeAbertura,
      obrigatorio('Informe o saldo do fundo no cadastro.'),
      SALDO,
    ),
  };
}
