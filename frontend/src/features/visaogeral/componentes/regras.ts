import type { AeronaveResponse, SituacaoRegular } from '@/compartilhado/aeronaves/useAeronaves';
import type { AvisoResponse } from '@/compartilhado/avisos/useAvisos';

import type { ResumoDaAeronave } from '../api/useVisaoGeral';

/** Uma aeronave na Visão geral: o cadastro (situação), o fechamento (dinheiro) e o diário (km). */
export interface LinhaDaFrota {
  aeronaveId: number;
  matricula: string;
  modelo: string;
  situacao: SituacaoRegular;
  saldo: number;
  fixos: number;
  variaveis: number;
  horas: number;
  km: number;
  coberturaEmMeses: number | undefined;
  avisos: AvisoResponse[];
}

const PESO_DA_SITUACAO: Record<SituacaoRegular, number> = { VENCIDO: 0, ATENCAO: 1, REGULAR: 2 };

/** Junta as três fontes por aeronave. Aeronave sem resumo (ainda carregando) fica de fora. */
export function linhasDaFrota(
  aeronaves: AeronaveResponse[],
  resumos: ResumoDaAeronave[],
  kmPorAeronave: Map<number, number>,
  avisos: AvisoResponse[],
): LinhaDaFrota[] {
  const porId = new Map(resumos.map((resumo) => [resumo.aeronaveId, resumo]));
  return aeronaves.flatMap((aeronave) => {
    const resumo = porId.get(aeronave.id);
    if (!resumo || aeronave.id == null) {
      return [];
    }
    return [
      {
        aeronaveId: aeronave.id,
        matricula: aeronave.matricula ?? '',
        modelo: aeronave.modelo ?? '',
        situacao: aeronave.situacaoRegular ?? 'REGULAR',
        saldo: resumo.saldoDoFundo ?? 0,
        fixos: resumo.custosFixos ?? 0,
        variaveis: resumo.custosVariaveis ?? 0,
        horas: resumo.horas ?? 0,
        km: kmPorAeronave.get(aeronave.id) ?? 0,
        coberturaEmMeses: resumo.coberturaEmMeses ?? undefined,
        avisos: avisos.filter((aviso) => aviso.aeronaveId === aeronave.id),
      },
    ];
  });
}

/**
 * A ordem de "exigem mais atenção": situação pior primeiro; empatadas, o fundo mais curto — saldo
 * negativo, depois a menor cobertura —, e por último a que tem mais avisos.
 */
export function porAtencao(a: LinhaDaFrota, b: LinhaDaFrota): number {
  return (
    PESO_DA_SITUACAO[a.situacao] - PESO_DA_SITUACAO[b.situacao] ||
    Math.sign(a.saldo) - Math.sign(b.saldo) ||
    (a.coberturaEmMeses ?? Infinity) - (b.coberturaEmMeses ?? Infinity) ||
    b.avisos.length - a.avisos.length
  );
}

export type FaixaDeCobertura = 'critica' | 'atencao' | 'folgada' | 'indefinida';

/** Menos de um mês é crítico; até três, atenção; seis meses enchem a barra. */
export function faixaDeCobertura(meses: number | undefined): FaixaDeCobertura {
  if (meses === undefined) {
    return 'indefinida';
  }
  if (meses < 1) {
    return 'critica';
  }
  return meses < 3 ? 'atencao' : 'folgada';
}

export const MESES_DA_BARRA_CHEIA = 6;

export function larguraDaCobertura(meses: number | undefined): number {
  return meses === undefined ? 0 : Math.min(meses / MESES_DA_BARRA_CHEIA, 1) * 100;
}

/** R$ por hora voada no mês; sem hora, não há custo por hora. */
export function custoPorHora(linha: LinhaDaFrota): number | undefined {
  return linha.horas > 0 ? (linha.fixos + linha.variaveis) / linha.horas : undefined;
}

export interface Barra {
  aeronaveId: number;
  rotulo: string;
  valor: number;
  /** Larguras em % do maior valor; a segunda é a parte variável, quando a barra é dividida. */
  largura1: number;
  largura2: number;
}

export interface Comparativo {
  barras: Barra[];
  /** Posição da média, em % do maior valor. */
  posicaoDaMedia: number;
  media: number;
  outras: number;
}

export const BARRAS_POR_GRAFICO = 6;

/**
 * Um gráfico do comparativo: as aeronaves com valor, do maior para o menor, as seis primeiras, e a
 * média de todas as que têm valor. `partes` divide a barra em duas séries (fixo e variável).
 */
export function comparativo(
  linhas: LinhaDaFrota[],
  valor: (linha: LinhaDaFrota) => number | undefined,
  partes?: (linha: LinhaDaFrota) => [number, number],
): Comparativo {
  const comValor = linhas
    .map((linha) => ({ linha, v: valor(linha) }))
    .filter(
      (item): item is { linha: LinhaDaFrota; v: number } => item.v !== undefined && item.v > 0,
    )
    .sort((a, b) => b.v - a.v);
  const maior = comValor[0]?.v ?? 0;
  const media =
    comValor.length > 0 ? comValor.reduce((soma, item) => soma + item.v, 0) / comValor.length : 0;
  const escala = (x: number) => (maior > 0 ? (x / maior) * 100 : 0);
  return {
    barras: comValor.slice(0, BARRAS_POR_GRAFICO).map(({ linha, v }) => {
      const [p1, p2] = partes ? partes(linha) : [v, 0];
      return {
        aeronaveId: linha.aeronaveId,
        rotulo: linha.matricula,
        valor: v,
        largura1: escala(p1),
        largura2: escala(p2),
      };
    }),
    posicaoDaMedia: escala(media),
    media,
    outras: Math.max(0, comValor.length - BARRAS_POR_GRAFICO),
  };
}
