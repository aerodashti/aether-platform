import { somarDias } from '@/compartilhado/formatacao/datas';
import {
  dataEntre,
  numero,
  obrigatorio,
  primeiraFalha,
  tamanhoMaximo,
} from '@/compartilhado/formulario/regras';
import type { Erros } from '@/compartilhado/formulario/useValidacao';

import { centavosEmReais } from './conversaoEmReais';
import type { SituacaoDaLista } from './opcoesDoCusto';
import type { RascunhoDoCusto } from './rascunhoDoCusto';

export type CampoDoCusto = keyof RascunhoDoCusto;

/** Na ordem da tela: é a ordem em que o resumo os lista. */
export const ROTULOS_DO_CUSTO: Record<CampoDoCusto, string> = {
  aeronaveId: 'Aeronave',
  categoria: 'Categoria',
  data: 'Data do custo',
  proprietarioId: 'Atribuição',
  relatorioDeVoo: 'Rel-voo',
  moeda: 'Moeda',
  valor: 'Valor',
  cambio: 'Câmbio do dia',
  descricao: 'Descrição',
  notaFiscal: 'N. Fiscal / Invoice',
};

/** O teto de `NUMERIC(14,2)`, a coluna do valor — o mesmo `@Digits` do `CustoRequest`. */
export const VALOR_MAXIMO = 999_999_999_999.99;
const CENTAVOS_MAXIMOS = 99_999_999_999_999n;
/** Reais por dólar: acima disso é dígito a mais, não cotação. */
export const CAMBIO_MAXIMO = 100;
/** Antes disso é ano digitado errado. */
export const PRIMEIRA_DATA_DO_CUSTO = '2000-01-01';
/** A conta já emitida pode ser lançada antes da data, até este tanto de dias. */
const DIAS_DE_ANTECEDENCIA = 31;

export function ultimaDataDoCusto(hoje: string): string {
  return somarDias(hoje, DIAS_DE_ANTECEDENCIA);
}

export interface ContextoDoCusto {
  /** Hoje, no fuso de quem usa (`hojeLocal()`). */
  hoje: string;
  /** Proprietários e vínculos: sem eles, a Atribuição só oferece o rateio. */
  donos: SituacaoDaLista;
}

const LISTA_DE_DONOS_INDISPONIVEL: Record<SituacaoDaLista, string | undefined> = {
  carregando: 'Aguarde a lista de proprietários carregar.',
  falhou: 'A lista de proprietários não carregou: tente de novo antes de salvar.',
  pronta: undefined,
};

function erroDoCambio({ moeda, cambio }: RascunhoDoCusto): string | undefined {
  if (moeda !== 'USD') {
    return undefined;
  }
  return primeiraFalha(
    cambio,
    obrigatorio('Informe o câmbio do dia.'),
    numero({ maiorQue: 0, maximo: CAMBIO_MAXIMO, casas: 4 }),
  );
}

/** Em USD, o original e o câmbio cabem nas colunas, mas o BRL derivado pode não caber. */
function erroDaConversao({ moeda, valor, cambio }: RascunhoDoCusto): string | undefined {
  const centavos = moeda === 'USD' ? centavosEmReais(valor, cambio) : null;
  return centavos !== null && centavos > CENTAVOS_MAXIMOS
    ? 'Convertido para reais, o lançamento passa de R$ 999.999.999.999,99.'
    : undefined;
}

/** Os limites do `CustoRequest` e das colunas, ditos no campo antes da ida ao servidor. */
export function validarCusto(
  rascunho: RascunhoDoCusto,
  { hoje, donos }: ContextoDoCusto,
): Erros<CampoDoCusto> {
  const cambio = erroDoCambio(rascunho);
  const valor = primeiraFalha(
    rascunho.valor,
    obrigatorio('Informe o valor.'),
    numero({ maiorQue: 0, maximo: VALOR_MAXIMO, casas: 2 }),
  );
  return {
    aeronaveId: primeiraFalha(rascunho.aeronaveId, obrigatorio('Escolha a aeronave.')),
    categoria: primeiraFalha(rascunho.categoria, obrigatorio('Escolha a categoria.')),
    data: primeiraFalha(
      rascunho.data,
      obrigatorio('Informe a data do custo.'),
      dataEntre({ minimo: PRIMEIRA_DATA_DO_CUSTO, maximo: ultimaDataDoCusto(hoje) }),
    ),
    proprietarioId: LISTA_DE_DONOS_INDISPONIVEL[donos],
    relatorioDeVoo: primeiraFalha(rascunho.relatorioDeVoo, tamanhoMaximo(20)),
    valor: valor ?? (cambio ? undefined : erroDaConversao(rascunho)),
    cambio,
    descricao: primeiraFalha(
      rascunho.descricao,
      obrigatorio('Informe a descrição.'),
      tamanhoMaximo(200),
    ),
    notaFiscal: primeiraFalha(rascunho.notaFiscal, tamanhoMaximo(40)),
  };
}
