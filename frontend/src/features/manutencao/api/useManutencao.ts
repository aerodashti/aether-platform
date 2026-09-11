import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { buscar, enviar } from '@/api/cliente';
import type { components } from '@/api/tipos-gerados';
import { contexto } from '@/compartilhado/observabilidade/observabilidade';

export type PainelDeManutencaoResponse = components['schemas']['PainelDeManutencaoResponse'];
export type ManutencaoResponse = components['schemas']['ManutencaoResponse'];
export type ManutencaoRequest = components['schemas']['ManutencaoRequest'];
export type ParametroResponse = components['schemas']['ParametroResponse'];
export type ParametroRequest = components['schemas']['ParametroRequest'];
export type TipoDeParametro = NonNullable<ParametroResponse['tipo']>;
export type SituacaoDoParametro = NonNullable<ParametroResponse['situacao']>;

const CHAVE = ['manutencao'] as const;

export function usePainelDeManutencao(aeronaveId: string) {
  return useQuery({
    queryKey: [...CHAVE, aeronaveId],
    queryFn: () => buscar<PainelDeManutencaoResponse>(`/manutencoes?aeronave=${aeronaveId}`),
    enabled: aeronaveId !== '',
    placeholderData: (anterior) => anterior,
  });
}

function useAcaoDeManutencao<T>(nome: string, acao: (entrada: T) => Promise<unknown>) {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (entrada: T) => contexto.interacao(nome, () => acao(entrada)),
    onSuccess: () => void cliente.invalidateQueries({ queryKey: CHAVE }),
  });
}

export function useAgendarManutencao() {
  return useAcaoDeManutencao<ManutencaoRequest>('agendar-manutencao', (manutencao) =>
    enviar<ManutencaoResponse>('/manutencoes', manutencao),
  );
}

export function useCorrigirManutencao() {
  return useAcaoDeManutencao<{ id: number; manutencao: ManutencaoRequest }>(
    'corrigir-manutencao',
    ({ id, manutencao }) => enviar<ManutencaoResponse>(`/manutencoes/${id}`, manutencao, 'PUT'),
  );
}

export function useConcluirManutencao() {
  return useAcaoDeManutencao<number>('concluir-manutencao', (id) =>
    enviar<ManutencaoResponse>(`/manutencoes/${id}/conclusao`),
  );
}

export function useReabrirManutencao() {
  return useAcaoDeManutencao<number>('reabrir-manutencao', (id) =>
    enviar<ManutencaoResponse>(`/manutencoes/${id}/reabertura`),
  );
}

export function useExcluirManutencao() {
  return useAcaoDeManutencao<number>('excluir-manutencao', (id) =>
    enviar<void>(`/manutencoes/${id}`, undefined, 'DELETE'),
  );
}

export function useCriarParametro() {
  return useAcaoDeManutencao<ParametroRequest>('criar-parametro', (parametro) =>
    enviar<ParametroResponse>('/manutencoes/parametros', parametro),
  );
}

export function useAtualizarParametro() {
  return useAcaoDeManutencao<{ id: number; parametro: ParametroRequest }>(
    'atualizar-parametro',
    ({ id, parametro }) =>
      enviar<ParametroResponse>(`/manutencoes/parametros/${id}`, parametro, 'PUT'),
  );
}

export function useExcluirParametro() {
  return useAcaoDeManutencao<number>('excluir-parametro', (id) =>
    enviar<void>(`/manutencoes/parametros/${id}`, undefined, 'DELETE'),
  );
}
