import {
  numero,
  obrigatorio,
  primeiraFalha,
  tamanhoMaximo,
} from '@/compartilhado/formulario/regras';
import type { Erros } from '@/compartilhado/formulario/useValidacao';

import { semPercentual, type RascunhoDoRendimento } from './rascunhoDoRendimento';
import { dataDoCredito, valorEmReais } from './regrasDoFundo';

export type CampoDoRendimento = keyof RascunhoDoRendimento;

/** Na ordem da tela: é a ordem em que o resumo os lista. */
export const ROTULOS_DO_RENDIMENTO: Record<CampoDoRendimento, string> = {
  aeronaveId: 'Aeronave',
  data: 'Data do crédito',
  aplicacao: 'Aplicação',
  saldoAplicado: 'Saldo aplicado (R$)',
  taxa: 'Taxa do mês (%)',
  valor: 'Rendimento (R$)',
};

/** Acima disso, ao mês, é dígito a mais — o `@DecimalMax` do `RendimentoRequest`. */
export const TAXA_MAXIMA = 10;

/** O limite da coluna `aplicacao`. */
const TAMANHO_DA_APLICACAO = 60;

/** Os limites do `RendimentoRequest`, das colunas e da entidade, ditos no campo antes do servidor. */
export function validarRendimento(
  rascunho: RascunhoDoRendimento,
  { hoje }: { hoje: string },
): Erros<CampoDoRendimento> {
  return {
    aeronaveId: primeiraFalha(rascunho.aeronaveId, obrigatorio('Escolha a aeronave.')),
    data: primeiraFalha(
      rascunho.data,
      obrigatorio('Informe a data do crédito.'),
      dataDoCredito(
        hoje,
        'Registre o rendimento depois que o crédito cair: use uma data até hoje.',
      ),
    ),
    aplicacao: primeiraFalha(
      rascunho.aplicacao,
      obrigatorio('Informe a aplicação.'),
      tamanhoMaximo(TAMANHO_DA_APLICACAO),
    ),
    saldoAplicado: primeiraFalha(rascunho.saldoAplicado, valorEmReais),
    taxa: primeiraFalha(
      semPercentual(rascunho.taxa),
      numero({ maiorQue: 0, maximo: TAXA_MAXIMA, casas: 4 }),
    ),
    valor: primeiraFalha(rascunho.valor, obrigatorio('Informe o rendimento.'), valorEmReais),
  };
}
