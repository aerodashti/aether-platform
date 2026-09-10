import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { buscar, enviar } from '@/api/cliente';
import type { components } from '@/api/tipos-gerados';
import { contexto } from '@/compartilhado/observabilidade/observabilidade';

export type ContratosDaAeronaveResponse = components['schemas']['ContratosDaAeronaveResponse'];
export type ContratoResponse = components['schemas']['ContratoResponse'];
export type ParticipacaoResponse = components['schemas']['ParticipacaoResponse'];
export type DefinirContratoRequest = components['schemas']['DefinirContratoRequest'];

const CHAVE = ['contratos'] as const;

export function useContratos(aeronaveId: number) {
  return useQuery({
    queryKey: [...CHAVE, aeronaveId],
    queryFn: () => buscar<ContratosDaAeronaveResponse>(`/aeronaves/${aeronaveId}/contratos`),
  });
}

/** Definir arquiva o vigente no servidor; aqui só se invalida a consulta inteira. */
export function useDefinirContrato(aeronaveId: number) {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (request: DefinirContratoRequest) =>
      contexto.interacao('definir-contrato', () =>
        enviar<ContratosDaAeronaveResponse>(`/aeronaves/${aeronaveId}/contratos`, request),
      ),
    onSuccess: () => void cliente.invalidateQueries({ queryKey: CHAVE }),
  });
}
