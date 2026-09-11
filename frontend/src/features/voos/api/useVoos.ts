import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { buscar, enviar } from '@/api/cliente';
import type { components } from '@/api/tipos-gerados';
import { contexto } from '@/compartilhado/observabilidade/observabilidade';

export type DiarioDeVoosResponse = components['schemas']['DiarioDeVoosResponse'];
export type TrechoResponse = components['schemas']['TrechoResponse'];
export type TrechoRequest = components['schemas']['TrechoRequest'];

export interface FiltroDoDiario {
  /** Vazio é a frota inteira. */
  aeronaveId: string;
  /** "AAAA-MM"; vazio é todo o histórico. */
  competencia: string;
}

const CHAVE = ['voos'] as const;

export function useVoos(filtro: FiltroDoDiario) {
  const parametros = new URLSearchParams();
  if (filtro.aeronaveId) {
    parametros.set('aeronave', filtro.aeronaveId);
  }
  if (filtro.competencia) {
    parametros.set('competencia', filtro.competencia);
  }
  return useQuery({
    queryKey: [...CHAVE, filtro],
    queryFn: () => buscar<DiarioDeVoosResponse>(`/voos?${parametros.toString()}`),
    // Mantém o recorte anterior visível enquanto o novo chega: sem isto, trocar o filtro faz a
    // grade piscar para vazio.
    placeholderData: (anterior) => anterior,
  });
}

/**
 * As três ações do diário. Invalidam o diário e a frota: o lançamento alimenta os contadores da
 * aeronave, e a ficha técnica não pode mostrar um total que o diário já mudou.
 */
function useAcaoSobreVoos<T>(nome: string, acao: (entrada: T) => Promise<unknown>) {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (entrada: T) => contexto.interacao(nome, () => acao(entrada)),
    onSuccess: () => {
      void cliente.invalidateQueries({ queryKey: CHAVE });
      void cliente.invalidateQueries({ queryKey: ['aeronaves'] });
      void cliente.invalidateQueries({ queryKey: ['aeronave-detalhe'] });
    },
  });
}

export function useRegistrarTrecho() {
  return useAcaoSobreVoos<TrechoRequest>('registrar-trecho', (trecho) =>
    enviar<TrechoResponse>('/voos', trecho),
  );
}

export function useCorrigirTrecho() {
  return useAcaoSobreVoos<{ id: number; trecho: TrechoRequest }>(
    'corrigir-trecho',
    ({ id, trecho }) => enviar<TrechoResponse>(`/voos/${id}`, trecho, 'PUT'),
  );
}

export function useExcluirTrecho() {
  return useAcaoSobreVoos<number>('excluir-trecho', (id) =>
    enviar<void>(`/voos/${id}`, undefined, 'DELETE'),
  );
}
