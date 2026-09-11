import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { buscar, enviar } from '@/api/cliente';
import type { components } from '@/api/tipos-gerados';
import { contexto } from '@/compartilhado/observabilidade/observabilidade';

export type DetalheDaAeronaveResponse = components['schemas']['DetalheDaAeronaveResponse'];
export type FichaTecnicaRequest = components['schemas']['FichaTecnicaRequest'];
export type ContadoresRequest = components['schemas']['ContadoresRequest'];
export type ConfiguracaoFinanceiraRequest = components['schemas']['ConfiguracaoFinanceiraRequest'];
export type BaseDoRateio = NonNullable<ConfiguracaoFinanceiraRequest['baseDoRateio']>;
export type ModeloDeAporte = NonNullable<ConfiguracaoFinanceiraRequest['modeloDeAporte']>;

const CHAVE = ['aeronave-detalhe'] as const;

export function useDetalheDaAeronave(id: number) {
  return useQuery({
    queryKey: [...CHAVE, id],
    queryFn: () => buscar<DetalheDaAeronaveResponse>(`/aeronaves/${id}`),
  });
}

/**
 * As três edições do detalhe. Invalidam o detalhe e a lista da frota: modelo e base aparecem nas
 * duas telas, e uma frota desatualizada atrás do botão Voltar leria como dado novo.
 */
function useEdicaoDoDetalhe<T>(nome: string, acao: (entrada: T) => Promise<unknown>) {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (entrada: T) => contexto.interacao(nome, () => acao(entrada)),
    onSuccess: () => {
      void cliente.invalidateQueries({ queryKey: CHAVE });
      void cliente.invalidateQueries({ queryKey: ['aeronaves'] });
    },
  });
}

export function useAtualizarFichaTecnica(id: number) {
  return useEdicaoDoDetalhe<FichaTecnicaRequest>('atualizar-ficha-tecnica', (ficha) =>
    enviar<DetalheDaAeronaveResponse>(`/aeronaves/${id}/ficha-tecnica`, ficha, 'PUT'),
  );
}

export function useCorrigirContadores(id: number) {
  return useEdicaoDoDetalhe<ContadoresRequest>('corrigir-contadores', (contadores) =>
    enviar<DetalheDaAeronaveResponse>(`/aeronaves/${id}/contadores`, contadores, 'PUT'),
  );
}

export function useAtualizarConfiguracaoFinanceira(id: number) {
  return useEdicaoDoDetalhe<ConfiguracaoFinanceiraRequest>(
    'atualizar-configuracao-financeira',
    (configuracao) =>
      enviar<DetalheDaAeronaveResponse>(
        `/aeronaves/${id}/configuracao-financeira`,
        configuracao,
        'PUT',
      ),
  );
}

export type CriarAeronaveRequest = components['schemas']['CriarAeronaveRequest'];

/** O cadastro da tela "Nova aeronave". Invalida a frota: a linha nova precisa aparecer nela. */
export function useCriarAeronave() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (cadastro: CriarAeronaveRequest) =>
      contexto.interacao('criar-aeronave', () =>
        enviar<DetalheDaAeronaveResponse>('/aeronaves', cadastro),
      ),
    onSuccess: () => {
      void cliente.invalidateQueries({ queryKey: CHAVE });
      void cliente.invalidateQueries({ queryKey: ['aeronaves'] });
    },
  });
}
