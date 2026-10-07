import { lerNumero, numeroParaCampo } from '@/compartilhado/formatacao/numero';

import type { RendimentoRequest, RendimentoResponse } from '../api/useAportes';

/**
 * O rendimento como a pessoa o copia do extrato: texto em tudo e os nomes do JSON do request,
 * para que o `campos` de um 400 caia no campo certo.
 */
export interface RascunhoDoRendimento {
  aeronaveId: string;
  data: string;
  aplicacao: string;
  saldoAplicado: string;
  taxa: string;
  valor: string;
}

/** O extrato escreve "0,91%": o símbolo é da unidade, não do número. */
export function semPercentual(taxa: string): string {
  return taxa.replace(/%\s*$/, '');
}

/** Para registrar, o crédito de hoje na aeronave do filtro; para corrigir, o rendimento gravado. */
export function rascunhoInicial(
  rendimento: RendimentoResponse | undefined,
  aeronaveInicial: string | undefined,
  hoje: string,
): RascunhoDoRendimento {
  return {
    aeronaveId:
      rendimento?.aeronaveId == null ? (aeronaveInicial ?? '') : String(rendimento.aeronaveId),
    data: rendimento?.data ?? hoje,
    aplicacao: rendimento?.aplicacao ?? '',
    // A API devolve `null` no extrato vazio (o tipo gerado diz só `undefined`): os dois viram ''.
    saldoAplicado: numeroParaCampo(rendimento?.saldoAplicado),
    taxa: numeroParaCampo(rendimento?.taxa),
    valor: numeroParaCampo(rendimento?.valor),
  };
}

/** Campo opcional: vazio não vai; preenchido, precisa ser número — nunca vira `null` calado. */
function opcional(texto: string): number | undefined | null {
  return texto.trim() === '' ? undefined : lerNumero(texto);
}

/**
 * O corpo do request, ou `undefined` se algum número preenchido não converte — o que a validação já
 * barrou antes. Um `NaN` iria como `null` no JSON e apagaria a taxa gravada sem aviso.
 */
export function corpoDoRendimento(rascunho: RascunhoDoRendimento): RendimentoRequest | undefined {
  const valor = lerNumero(rascunho.valor);
  const saldoAplicado = opcional(rascunho.saldoAplicado);
  const taxa = opcional(semPercentual(rascunho.taxa));
  if (rascunho.aeronaveId === '' || valor === null || saldoAplicado === null || taxa === null) {
    return undefined;
  }
  return {
    aeronaveId: Number(rascunho.aeronaveId),
    data: rascunho.data,
    aplicacao: rascunho.aplicacao,
    saldoAplicado,
    taxa,
    valor,
  };
}

/**
 * Saldo × taxa, em reais, quando os dois estão no extrato — para conferir o valor creditado à
 * vista. Só informa: o banco arredonda do jeito dele, e quem vale é o crédito.
 */
export function rendimentoPeloExtrato(rascunho: RascunhoDoRendimento): number | null {
  const saldo = lerNumero(rascunho.saldoAplicado);
  const taxa = lerNumero(semPercentual(rascunho.taxa));
  if (saldo === null || taxa === null || saldo <= 0 || taxa <= 0) {
    return null;
  }
  return Math.round(saldo * taxa) / 100;
}
