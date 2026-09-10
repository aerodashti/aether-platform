import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { buscar, enviar } from '@/api/cliente';
import type { components } from '@/api/tipos-gerados';
import { contexto } from '@/compartilhado/observabilidade/observabilidade';

export type TripulanteResponse = components['schemas']['TripulanteResponse'];
export type TripulanteRequest = components['schemas']['TripulanteRequest'];
export type FuncaoDoTripulante = NonNullable<TripulanteRequest['funcao']>;
export type SituacaoDoTripulante = NonNullable<TripulanteRequest['situacao']>;

const CHAVE = ['tripulantes'] as const;

export function useTripulantes(aeronaveId: number) {
  return useQuery({
    queryKey: [...CHAVE, aeronaveId],
    queryFn: () => buscar<TripulanteResponse[]>(`/aeronaves/${aeronaveId}/tripulantes`),
  });
}

function useAcaoSobreTripulantes<T>(nome: string, acao: (entrada: T) => Promise<unknown>) {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (entrada: T) => contexto.interacao(nome, () => acao(entrada)),
    onSuccess: () => void cliente.invalidateQueries({ queryKey: CHAVE }),
  });
}

export function useCriarTripulante(aeronaveId: number) {
  return useAcaoSobreTripulantes<TripulanteRequest>('criar-tripulante', (cadastro) =>
    enviar<TripulanteResponse>(`/aeronaves/${aeronaveId}/tripulantes`, cadastro),
  );
}

export function useAtualizarTripulante(aeronaveId: number) {
  return useAcaoSobreTripulantes<{ id: number; cadastro: TripulanteRequest }>(
    'atualizar-tripulante',
    ({ id, cadastro }) =>
      enviar<TripulanteResponse>(`/aeronaves/${aeronaveId}/tripulantes/${id}`, cadastro, 'PUT'),
  );
}
