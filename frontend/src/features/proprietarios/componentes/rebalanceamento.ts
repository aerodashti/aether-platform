import type { VinculoVigenteResponse } from '@/compartilhado/participacoes/useVinculosVigentes';

/** Uma fatia do contrato novo, com o percentual como o campo o mostra ("33,33"). */
export interface FatiaNova {
  proprietarioId: number;
  percentual: string;
}

/** O contrato novo de uma aeronave, sem quem sai: os demais com a participação atual. */
export interface ContratoSemQuemSai {
  aeronaveId: number;
  matricula: string;
  /** O percentual de quem sai, que precisa ir para alguém. */
  liberado: number;
  fatias: FatiaNova[];
}

const DUAS_CASAS = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

export function lerPercentual(texto: string): number {
  const valor = Number(texto.trim().replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(valor) ? valor : Number.NaN;
}

/**
 * O ponto de partida do protótipo: cada aeronave de quem sai, com os demais proprietários na
 * participação atual — a soma fica abaixo de 100 pelo que ele tinha, e a pessoa distribui.
 */
export function contratosSemQuemSai(
  vinculos: VinculoVigenteResponse[] | undefined,
  quemSai: number,
): ContratoSemQuemSai[] {
  const aeronavesDele = (vinculos ?? []).filter((vinculo) => vinculo.proprietarioId === quemSai);
  return aeronavesDele.map((dele) => ({
    aeronaveId: dele.aeronaveId ?? 0,
    matricula: dele.matricula ?? '',
    liberado: dele.percentual ?? 0,
    fatias: (vinculos ?? [])
      .filter(
        (vinculo) => vinculo.aeronaveId === dele.aeronaveId && vinculo.proprietarioId !== quemSai,
      )
      .map((vinculo) => ({
        proprietarioId: vinculo.proprietarioId ?? 0,
        percentual: DUAS_CASAS.format(vinculo.percentual ?? 0),
      })),
  }));
}

export function somaDasFatias(fatias: FatiaNova[]): number {
  return (
    Math.round(fatias.reduce((soma, fatia) => soma + lerPercentual(fatia.percentual), 0) * 100) /
    100
  );
}

/** Fecha quando soma 100 e toda fatia é maior que zero — a mesma regra do servidor. */
export function contratoFecha(fatias: FatiaNova[]): boolean {
  return (
    fatias.length > 0 &&
    fatias.every((fatia) => lerPercentual(fatia.percentual) > 0) &&
    Math.abs(somaDasFatias(fatias) - 100) < 0.005
  );
}
