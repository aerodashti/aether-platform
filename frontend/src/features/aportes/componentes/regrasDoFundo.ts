import { dataEntre, numero, type Regra } from '@/compartilhado/formulario/regras';

/**
 * O teto de `NUMERIC(14,2)`, a coluna dos valores do fundo — o mesmo `@Digits` de `AporteRequest`
 * e de `RendimentoRequest`.
 */
export const VALOR_MAXIMO = 999_999_999_999.99;

/** Antes disso é ano digitado errado — o `CalendarioDoFundo.PRIMEIRA_DATA` do servidor. */
export const PRIMEIRA_DATA = '2000-01-01';

/** Reais com centavos, maior que zero e dentro da coluna. */
export const valorEmReais: Regra = numero({ maiorQue: 0, maximo: VALOR_MAXIMO, casas: 2 });

/** O dinheiro entra no fundo depois de cair na conta: a data vai de 01/01/2000 até hoje. */
export function dataDoCredito(hoje: string, mensagemDeFuturo: string): Regra {
  return dataEntre({ minimo: PRIMEIRA_DATA, maximo: hoje, mensagemDeMaximo: mensagemDeFuturo });
}
