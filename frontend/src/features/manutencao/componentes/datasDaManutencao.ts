/**
 * As janelas de data da manutenção, as mesmas de `Manutencao` e `ParametroDeControle` no servidor:
 * fora delas é ano digitado errado, não registro.
 */

import { somarMeses } from '@/compartilhado/formatacao/datas';
import type { Regra } from '@/compartilhado/formulario/regras';

/** Antes disso, conclusão ou data limite é ano digitado errado. */
export const PRIMEIRA_DATA = '2000-01-01';

const UM_ANO = 12;
const DEZ_ANOS = 120;

/** Programar com até um ano de atraso é registro tardio do que já devia ter acontecido (D2). */
export function primeiraDataProgramavel(hoje: string): string {
  return somarMeses(hoje, -UM_ANO);
}

export function ultimaDataProgramavel(hoje: string): string {
  return somarMeses(hoje, DEZ_ANOS);
}

export function ultimaDataLimite(hoje: string): string {
  return somarMeses(hoje, DEZ_ANOS);
}

/** A conclusão vem no máximo um ano antes da data programada (D9), e nunca antes de 2000. */
export function primeiraDataDeConclusao(dataProgramada: string): string {
  const umAnoAntes = somarMeses(dataProgramada, -UM_ANO);
  return umAnoAntes < PRIMEIRA_DATA ? PRIMEIRA_DATA : umAnoAntes;
}

/**
 * O campo nativo aceita digitar um ano de cinco dígitos ("20266-10-07"), e a comparação de datas
 * como texto o poria dentro da janela: o ano precisa ter quatro dígitos antes de qualquer limite.
 */
export const anoDeQuatroDigitos: Regra = (texto) =>
  texto === '' || /^\d{4}-/.test(texto) ? undefined : 'Use um ano de quatro dígitos.';
