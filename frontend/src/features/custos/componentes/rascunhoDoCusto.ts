import { lerNumero, numeroParaCampo } from '@/compartilhado/formatacao/numero';

import type { CategoriaDeCusto, CustoRequest, CustoResponse, MoedaDoCusto } from '../api/useCustos';

/**
 * O lançamento como a pessoa o preenche: texto em tudo e os nomes do JSON do request, para que o
 * `campos` de um 400 caia no campo certo. O tipo não está aqui — não viaja, é consequência da
 * categoria.
 */
export interface RascunhoDoCusto {
  aeronaveId: string;
  categoria: CategoriaDeCusto | '';
  data: string;
  proprietarioId: string;
  relatorioDeVoo: string;
  moeda: MoedaDoCusto;
  valor: string;
  cambio: string;
  descricao: string;
  notaFiscal: string;
}

function idParaCampo(id: number | null | undefined): string {
  return id == null ? '' : String(id);
}

/** Vazio para registrar; para corrigir, o lançamento como foi gravado — em USD, o valor original. */
export function rascunhoInicial(
  custo: CustoResponse | undefined,
  aeronaveInicial: string | undefined,
): RascunhoDoCusto {
  return {
    aeronaveId: custo ? idParaCampo(custo.aeronaveId) : (aeronaveInicial ?? ''),
    categoria: custo?.categoria ?? '',
    data: custo?.data ?? '',
    proprietarioId: idParaCampo(custo?.proprietarioId),
    relatorioDeVoo: custo?.relatorioDeVoo ?? '',
    moeda: custo?.moeda ?? 'BRL',
    valor: numeroParaCampo(custo?.moeda === 'USD' ? custo.valorOriginal : custo?.valor),
    // A API devolve `null` em BRL (o tipo gerado diz só `undefined`): `numeroParaCampo` cobre os dois.
    cambio: numeroParaCampo(custo?.cambio),
    descricao: custo?.descricao ?? '',
    notaFiscal: custo?.notaFiscal ?? '',
  };
}

/**
 * O corpo do request, ou `undefined` se o rascunho não converte — o que a validação já barrou
 * antes. Nunca sai `NaN`: no JSON ele vira `null`, e o servidor responderia "Informe o valor." a
 * quem digitou um valor.
 */
export function corpoDoCusto(rascunho: RascunhoDoCusto): CustoRequest | undefined {
  const valor = lerNumero(rascunho.valor);
  const cambio = rascunho.moeda === 'USD' ? lerNumero(rascunho.cambio) : null;
  if (rascunho.aeronaveId === '' || rascunho.categoria === '' || valor === null) {
    return undefined;
  }
  return {
    aeronaveId: Number(rascunho.aeronaveId),
    categoria: rascunho.categoria,
    data: rascunho.data,
    descricao: rascunho.descricao,
    relatorioDeVoo: rascunho.relatorioDeVoo || undefined,
    proprietarioId: rascunho.proprietarioId === '' ? undefined : Number(rascunho.proprietarioId),
    notaFiscal: rascunho.notaFiscal || undefined,
    moeda: rascunho.moeda,
    valor,
    cambio: cambio ?? undefined,
  };
}
