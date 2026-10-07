import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { buscar, enviar } from '@/api/cliente';
import type { components } from '@/api/tipos-gerados';
import { contexto } from '@/compartilhado/observabilidade/observabilidade';

export type TrocasResponse = components['schemas']['TrocasResponse'];
export type TrocaResponse = components['schemas']['TrocaResponse'];
export type TrocaRequest = components['schemas']['TrocaRequest'];
export type SituacaoDaTroca = NonNullable<TrocaResponse['situacao']>;

/**
 * A devolução com a data em que aconteceu. Declarado aqui até a próxima geração de
 * `tipos-gerados.ts`, que traz o `ConclusaoDaTrocaRequest` do backend.
 */
export interface ConclusaoDaTrocaRequest {
  concluidaEm: string;
}

const CHAVE = ['trocas'] as const;

export function useTrocas(proprietarioId: string, situacao: SituacaoDaTroca) {
  const parametros = new URLSearchParams({ situacao });
  if (proprietarioId) {
    parametros.set('proprietario', proprietarioId);
  }
  return useQuery({
    queryKey: [...CHAVE, proprietarioId, situacao],
    queryFn: () => buscar<TrocasResponse>(`/trocas?${parametros.toString()}`),
    placeholderData: (anterior) => anterior,
  });
}

function useAcaoSobreTrocas<T>(nome: string, acao: (entrada: T) => Promise<unknown>) {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (entrada: T) => contexto.interacao(nome, () => acao(entrada)),
    onSuccess: () => void cliente.invalidateQueries({ queryKey: CHAVE }),
  });
}

export function useRegistrarTroca() {
  return useAcaoSobreTrocas<TrocaRequest>('registrar-troca', (troca) =>
    enviar<TrocaResponse>('/trocas', troca),
  );
}

export function useCorrigirTroca() {
  return useAcaoSobreTrocas<{ id: number; troca: TrocaRequest }>(
    'corrigir-troca',
    ({ id, troca }) => enviar<TrocaResponse>(`/trocas/${id}`, troca, 'PUT'),
  );
}

export function useConcluirTroca() {
  return useAcaoSobreTrocas<{ id: number; conclusao: ConclusaoDaTrocaRequest }>(
    'concluir-troca',
    ({ id, conclusao }) => enviar<TrocaResponse>(`/trocas/${id}/conclusao`, conclusao),
  );
}

export function useReabrirTroca() {
  return useAcaoSobreTrocas<number>('reabrir-troca', (id) =>
    enviar<TrocaResponse>(`/trocas/${id}/reabertura`, undefined),
  );
}
