import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { buscar, enviar } from '@/api/cliente';
import type { components } from '@/api/tipos-gerados';
import { contexto } from '@/compartilhado/observabilidade/observabilidade';

export type LancamentosResponse = components['schemas']['LancamentosResponse'];
export type CustoResponse = components['schemas']['CustoResponse'];
export type TotaisDosLancamentos = components['schemas']['TotaisDosLancamentos'];
export type CustoRequest = components['schemas']['CustoRequest'];
export type TipoDeCusto = NonNullable<CustoResponse['tipo']>;
export type CategoriaDeCusto = NonNullable<CustoResponse['categoria']>;
export type MoedaDoCusto = NonNullable<CustoResponse['moeda']>;

export interface FiltroDeCustos {
  aeronaveId: string;
  competencia: string;
}

const CHAVE = ['custos'] as const;

export function useCustos(filtro: FiltroDeCustos) {
  const parametros = new URLSearchParams();
  if (filtro.aeronaveId) {
    parametros.set('aeronave', filtro.aeronaveId);
  }
  if (filtro.competencia) {
    parametros.set('competencia', filtro.competencia);
  }
  return useQuery({
    queryKey: [...CHAVE, filtro],
    queryFn: () => buscar<LancamentosResponse>(`/custos?${parametros.toString()}`),
    placeholderData: (anterior) => anterior,
  });
}

function useAcaoSobreCustos<T>(nome: string, acao: (entrada: T) => Promise<unknown>) {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (entrada: T) => contexto.interacao(nome, () => acao(entrada)),
    onSuccess: () => void cliente.invalidateQueries({ queryKey: CHAVE }),
  });
}

export function useRegistrarCusto() {
  return useAcaoSobreCustos<CustoRequest>('registrar-custo', (custo) =>
    enviar<CustoResponse>('/custos', custo),
  );
}

export function useCorrigirCusto() {
  return useAcaoSobreCustos<{ id: number; custo: CustoRequest }>(
    'corrigir-custo',
    ({ id, custo }) => enviar<CustoResponse>(`/custos/${id}`, custo, 'PUT'),
  );
}

export function useExcluirCusto() {
  return useAcaoSobreCustos<number>('excluir-custo', (id) =>
    enviar<void>(`/custos/${id}`, undefined, 'DELETE'),
  );
}
