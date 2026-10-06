import { useQuery } from '@tanstack/react-query';

import { buscar } from '@/api/cliente';
import type { components } from '@/api/tipos-gerados';

export type FechamentoMensalResponse = components['schemas']['FechamentoMensalResponse'];
export type LinhaDoProprietario = components['schemas']['LinhaDoProprietario'];
export type FechamentoDoPeriodoResponse = components['schemas']['FechamentoDoPeriodoResponse'];
export type CompetenciaDoPeriodo = components['schemas']['Competencia'];

/**
 * O fechamento é calculado no servidor a cada leitura, a partir de custos, voos, aportes e
 * contratos. Sem `staleTime`: um lançamento feito em outra tela muda o fechamento, e a tela
 * recalcula sempre que monta.
 */
const CHAVE = ['fechamento'] as const;

export function useFechamentoMensal(aeronaveId: string, competencia: string) {
  return useQuery({
    queryKey: [...CHAVE, 'mensal', aeronaveId, competencia],
    queryFn: () =>
      buscar<FechamentoMensalResponse>(
        `/fechamentos/mensal?aeronave=${aeronaveId}&competencia=${competencia}`,
      ),
    enabled: aeronaveId !== '' && competencia !== '',
    placeholderData: (anterior) => anterior,
  });
}

export function useFechamentoDoPeriodo(aeronaveId: string, de: string, ate: string) {
  return useQuery({
    queryKey: [...CHAVE, 'periodo', aeronaveId, de, ate],
    queryFn: () =>
      buscar<FechamentoDoPeriodoResponse>(
        `/fechamentos/periodo?aeronave=${aeronaveId}&de=${de}&ate=${ate}`,
      ),
    enabled: aeronaveId !== '' && de !== '' && ate !== '' && de <= ate,
    placeholderData: (anterior) => anterior,
  });
}
