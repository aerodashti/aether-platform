import { useMutation, useQueryClient } from '@tanstack/react-query';

import { enviar } from '@/api/cliente';
import type { components } from '@/api/tipos-gerados';
import { contexto } from '@/compartilhado/observabilidade/observabilidade';

import { CHAVE_DE_PROPRIETARIOS, type ProprietarioResponse } from './useProprietarios';

export type ProprietarioRequest = components['schemas']['ProprietarioRequest'];

/**
 * Uma ação sobre o cadastro de proprietários. Todas invalidam a lista inteira: cadastrar insere no
 * meio da ordenação por nome, e desativar muda a situação que é filtro — remendar o cache item a
 * item erraria o recorte.
 */
export function useAcaoSobreProprietarios<T, R = ProprietarioResponse>(
  nome: string,
  acao: (entrada: T) => Promise<R>,
) {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (entrada: T) => contexto.interacao(nome, () => acao(entrada)),
    onSuccess: () => cliente.invalidateQueries({ queryKey: CHAVE_DE_PROPRIETARIOS }),
  });
}

/**
 * Cadastrar e atualizar moram aqui porque o painel de cadastro é compartilhado: a tela de
 * Proprietários é o CRUD, e o cadastro de aeronave abre o mesmo painel para criar um proprietário
 * sem sair do fluxo.
 */
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
