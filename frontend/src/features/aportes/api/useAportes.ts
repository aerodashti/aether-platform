import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { buscar, enviar } from '@/api/cliente';
import type { components } from '@/api/tipos-gerados';
import { contexto } from '@/compartilhado/observabilidade/observabilidade';

export type AportesResponse = components['schemas']['AportesResponse'];
export type AporteResponse = components['schemas']['AporteResponse'];
export type AporteRequest = components['schemas']['AporteRequest'];
export type RendimentosResponse = components['schemas']['RendimentosResponse'];
export type RendimentoResponse = components['schemas']['RendimentoResponse'];
export type RendimentoRequest = components['schemas']['RendimentoRequest'];

export interface FiltroDoFundo {
  /** Vazio é a frota inteira. */
  aeronaveId: string;
  /** Competência inicial, "AAAA-MM"; vazia é sem limite. */
  de: string;
  /** Competência final, "AAAA-MM"; vazia é sem limite. */
  ate: string;
}

const CHAVE_DE_APORTES = ['aportes'] as const;
const CHAVE_DE_RENDIMENTOS = ['rendimentos'] as const;

function parametrosDe(filtro: FiltroDoFundo): string {
  const parametros = new URLSearchParams();
  if (filtro.aeronaveId) {
    parametros.set('aeronave', filtro.aeronaveId);
  }
  if (filtro.de) {
    parametros.set('de', filtro.de);
  }
  if (filtro.ate) {
    parametros.set('ate', filtro.ate);
  }
  return parametros.toString();
}

export function useAportes(filtro: FiltroDoFundo) {
  return useQuery({
    queryKey: [...CHAVE_DE_APORTES, filtro],
    queryFn: () => buscar<AportesResponse>(`/aportes?${parametrosDe(filtro)}`),
    placeholderData: (anterior) => anterior,
  });
}

export function useRendimentos(filtro: FiltroDoFundo) {
  return useQuery({
    queryKey: [...CHAVE_DE_RENDIMENTOS, filtro],
    queryFn: () => buscar<RendimentosResponse>(`/rendimentos?${parametrosDe(filtro)}`),
    placeholderData: (anterior) => anterior,
  });
}

function useAcaoSobre<T>(
  chave: readonly string[],
  nome: string,
  acao: (entrada: T) => Promise<unknown>,
) {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (entrada: T) => contexto.interacao(nome, () => acao(entrada)),
    onSuccess: () => void cliente.invalidateQueries({ queryKey: chave }),
  });
}

export function useRegistrarAporte() {
  return useAcaoSobre<AporteRequest>(CHAVE_DE_APORTES, 'registrar-aporte', (aporte) =>
    enviar<AporteResponse>('/aportes', aporte),
  );
}

export function useCorrigirAporte() {
  return useAcaoSobre<{ id: number; aporte: AporteRequest }>(
    CHAVE_DE_APORTES,
    'corrigir-aporte',
    ({ id, aporte }) => enviar<AporteResponse>(`/aportes/${id}`, aporte, 'PUT'),
  );
}

export function useExcluirAporte() {
  return useAcaoSobre<number>(CHAVE_DE_APORTES, 'excluir-aporte', (id) =>
    enviar<void>(`/aportes/${id}`, undefined, 'DELETE'),
  );
}

export function useRegistrarRendimento() {
  return useAcaoSobre<RendimentoRequest>(CHAVE_DE_RENDIMENTOS, 'registrar-rendimento', (corpo) =>
    enviar<RendimentoResponse>('/rendimentos', corpo),
  );
}

export function useCorrigirRendimento() {
  return useAcaoSobre<{ id: number; rendimento: RendimentoRequest }>(
    CHAVE_DE_RENDIMENTOS,
    'corrigir-rendimento',
    ({ id, rendimento }) => enviar<RendimentoResponse>(`/rendimentos/${id}`, rendimento, 'PUT'),
  );
}

export function useExcluirRendimento() {
  return useAcaoSobre<number>(CHAVE_DE_RENDIMENTOS, 'excluir-rendimento', (id) =>
    enviar<void>(`/rendimentos/${id}`, undefined, 'DELETE'),
  );
}
