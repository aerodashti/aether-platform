import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { buscar, enviar } from '@/api/cliente';
import type { components } from '@/api/tipos-gerados';
import { contexto } from '@/compartilhado/observabilidade/observabilidade';

export type ProprietarioResponse = components['schemas']['ProprietarioResponse'];
export type ProprietarioRequest = components['schemas']['ProprietarioRequest'];
export type SituacaoDoProprietario = NonNullable<ProprietarioResponse['situacao']>;

const CHAVE = ['proprietarios'] as const;

/**
 * A lista completa, sem paginação nem filtro no servidor: os proprietários são poucas dezenas por
 * conta, e o recorte por busca e situação é feito aqui no front — a decisão está registrada no
 * `ProprietarioRepository` do backend.
 */
export function useProprietarios() {
  return useQuery({
    queryKey: CHAVE,
    queryFn: () => buscar<ProprietarioResponse[]>('/proprietarios'),
  });
}

/**
 * As ações da tela. Todas invalidam a lista inteira: cadastrar insere no meio da ordenação por
 * nome, e desativar muda a situação que é filtro — remendar o cache item a item erraria o recorte.
 */
function useAcaoSobreProprietarios<T>(nome: string, acao: (entrada: T) => Promise<unknown>) {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (entrada: T) => contexto.interacao(nome, () => acao(entrada)),
    onSuccess: () => cliente.invalidateQueries({ queryKey: CHAVE }),
  });
}

export function useCriarProprietario() {
  return useAcaoSobreProprietarios<ProprietarioRequest>('criar-proprietario', (cadastro) =>
    enviar<ProprietarioResponse>('/proprietarios', cadastro),
  );
}

export function useAtualizarProprietario() {
  return useAcaoSobreProprietarios<{ id: number; cadastro: ProprietarioRequest }>(
    'atualizar-proprietario',
    ({ id, cadastro }) => enviar<ProprietarioResponse>(`/proprietarios/${id}`, cadastro, 'PUT'),
  );
}

export function useDesativarProprietario() {
  return useAcaoSobreProprietarios<number>('desativar-proprietario', (id) =>
    enviar<ProprietarioResponse>(`/proprietarios/${id}/desativacao`),
  );
}

export function useReativarProprietario() {
  return useAcaoSobreProprietarios<number>('reativar-proprietario', (id) =>
    enviar<ProprietarioResponse>(`/proprietarios/${id}/reativacao`),
  );
}
