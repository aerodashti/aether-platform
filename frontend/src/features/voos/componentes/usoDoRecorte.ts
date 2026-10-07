import type { DiarioDeVoosResponse, TrechoResponse } from '../api/useVoos';

/** A participação de um proprietário nas horas voadas do recorte — um cartão de % de uso. */
export interface UsoDoProprietario {
  proprietarioId: number;
  nome: string;
  corDeIdentificacao: string | undefined;
  horas: number;
  km: number;
  /** Fração das horas atribuídas do recorte, de 0 a 100. */
  percentual: number;
}

/**
 * Quanto cada proprietário usou a aeronave no recorte, como no protótipo. Voo de manutenção fica de
 * fora — é de todos, e o rateio o divide; o percentual é sobre as horas atribuídas.
 */
export function usoPorProprietario(trechos: TrechoResponse[]): UsoDoProprietario[] {
  const porDono = new Map<number, UsoDoProprietario>();
  for (const trecho of trechos) {
    if (trecho.vooDeManutencao || trecho.proprietarioId == null) {
      continue;
    }
    const atual = porDono.get(trecho.proprietarioId) ?? {
      proprietarioId: trecho.proprietarioId,
      nome: trecho.nomeDoProprietario ?? '',
      corDeIdentificacao: trecho.corDeIdentificacao,
      horas: 0,
      km: 0,
      percentual: 0,
    };
    atual.horas += trecho.horas ?? 0;
    atual.km += trecho.km ?? 0;
    porDono.set(trecho.proprietarioId, atual);
  }
  const usos = [...porDono.values()];
  const total = usos.reduce((soma, uso) => soma + uso.horas, 0);
  return usos
    .map((uso) => ({ ...uso, percentual: total > 0 ? (uso.horas / total) * 100 : 0 }))
    .sort((a, b) => b.horas - a.horas);
}

/** Os Rel. Voo do recorte, do mais recente ao mais antigo — as opções do filtro por voo. */
export function relatoriosDoRecorte(trechos: TrechoResponse[]): string[] {
  return [...new Set(trechos.map((trecho) => trecho.relatorioDeVoo ?? ''))]
    .filter(Boolean)
    .sort()
    .reverse();
}

/**
 * O diário de um voo só. Os totais do servidor são do recorte inteiro; filtrado por voo, a linha de
 * TOTAIS soma só os trechos à vista — senão ela diria horas que a grade não mostra.
 */
export function diarioDoVoo(
  diario: DiarioDeVoosResponse | undefined,
  relatorioDeVoo: string,
): DiarioDeVoosResponse | undefined {
  if (!diario || relatorioDeVoo === '') {
    return diario;
  }
  const trechos = (diario.trechos ?? []).filter(
    (trecho) => trecho.relatorioDeVoo === relatorioDeVoo,
  );
  return {
    trechos,
    totais: {
      horas: trechos.reduce((soma, trecho) => soma + (trecho.horas ?? 0), 0),
      km: trechos.reduce((soma, trecho) => soma + (trecho.km ?? 0), 0),
      pousos: trechos.length,
    },
  };
}
