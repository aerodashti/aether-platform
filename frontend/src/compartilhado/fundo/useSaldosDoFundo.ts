import { useQuery } from '@tanstack/react-query';

import { buscar } from '@/api/cliente';
import type { components } from '@/api/tipos-gerados';

export type SaldoDaAeronave = components['schemas']['SaldoDaAeronaveResponse'];

/**
 * O saldo do fundo de cada aeronave e de cada proprietário nela, hoje — calculado pelo
 * fechamento, numa chamada só para a frota. A frota, o detalhe e os cartões de proprietário o
 * mostram; quem quiser o mês a mês abre o Fechamento.
 */
export function useSaldosDoFundo() {
  return useQuery({
    queryKey: ['fechamento', 'saldos'],
    queryFn: () => buscar<SaldoDaAeronave[]>('/fechamentos/saldos'),
  });
}

export function saldoDaAeronave(
  saldos: SaldoDaAeronave[] | undefined,
  aeronaveId: number | undefined,
): SaldoDaAeronave | undefined {
  return saldos?.find((saldo) => saldo.aeronaveId === aeronaveId);
}

export function contaNoFundo(
  saldos: SaldoDaAeronave[] | undefined,
  aeronaveId: number | undefined,
  proprietarioId: number | undefined,
) {
  return saldoDaAeronave(saldos, aeronaveId)?.contas?.find(
    (conta) => conta.proprietarioId === proprietarioId,
  );
}

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/** "2026-10" → "Out/26": o rótulo que acompanha o custo e o % no rateio da competência. */
export function competenciaAbreviada(competencia: string | undefined): string {
  const [ano = '', mes = ''] = (competencia ?? '').split('-');
  return mes ? `${MESES[Number(mes) - 1] ?? ''}/${ano.slice(2)}` : '';
}
