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
 *
 * <p>Com `habilitado` falso (sem aeronave, ou o recorte inválido) não há consulta, e o recorte
 * anterior não fica na tela fingindo ser o pedido.
 */
const CHAVE = ['fechamento'] as const;

export function useFechamentoMensal(aeronaveId: string, competencia: string, habilitado: boolean) {
  const parametros = new URLSearchParams({ aeronave: aeronaveId, competencia });
  return useQuery({
    queryKey: [...CHAVE, 'mensal', aeronaveId, competencia],
    queryFn: () => buscar<FechamentoMensalResponse>(`/fechamentos/mensal?${parametros.toString()}`),
    enabled: habilitado,
    placeholderData: (anterior) => (habilitado ? anterior : undefined),
  });
}

export function useFechamentoDoPeriodo(
  aeronaveId: string,
  de: string,
  ate: string,
  habilitado: boolean,
) {
  const parametros = new URLSearchParams({ aeronave: aeronaveId, de, ate });
  return useQuery({
    queryKey: [...CHAVE, 'periodo', aeronaveId, de, ate],
    queryFn: () =>
      buscar<FechamentoDoPeriodoResponse>(`/fechamentos/periodo?${parametros.toString()}`),
    enabled: habilitado,
    placeholderData: (anterior) => (habilitado ? anterior : undefined),
  });
}
