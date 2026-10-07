import { useQuery } from '@tanstack/react-query';

import { buscar } from '@/api/cliente';
import type { components } from '@/api/tipos-gerados';

export type ResumoDaAeronave = components['schemas']['ResumoDaAeronaveResponse'];
type DiarioDeVoos = components['schemas']['DiarioDeVoosResponse'];

/**
 * A frota numa competência, do fechamento: saldo, custos, horas e cobertura de cada aeronave.
 * Calculado no servidor a cada leitura, como o fechamento — sem `staleTime`.
 */
export function useResumoDaFrota(competencia: string) {
  return useQuery({
    queryKey: ['fechamento', 'frota', competencia],
    queryFn: () => buscar<ResumoDaAeronave[]>(`/fechamentos/frota?competencia=${competencia}`),
  });
}

/** Os trechos da competência, para os km de cada aeronave — o fechamento conta só horas. */
export function useTrechosDoMes(competencia: string) {
  return useQuery({
    queryKey: ['voos', { aeronaveId: '', competencia }],
    queryFn: () => buscar<DiarioDeVoos>(`/voos?competencia=${competencia}`),
  });
}
