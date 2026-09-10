import { useMutation, useQueryClient } from '@tanstack/react-query';

import { enviar } from '@/api/cliente';
import type { components } from '@/api/tipos-gerados';
import { contexto } from '@/compartilhado/observabilidade/observabilidade';
import type { ProprietarioResponse as Proprietario } from '@/compartilhado/proprietarios/useProprietarios';
import { CHAVE_DE_PROPRIETARIOS } from '@/compartilhado/proprietarios/useProprietarios';

export type {
  ProprietarioResponse,
  SituacaoDoProprietario,
} from '@/compartilhado/proprietarios/useProprietarios';
export { useProprietarios } from '@/compartilhado/proprietarios/useProprietarios';
export type ProprietarioRequest = components['schemas']['ProprietarioRequest'];

const CHAVE = CHAVE_DE_PROPRIETARIOS;

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
    enviar<Proprietario>('/proprietarios', cadastro),
  );
}

export function useAtualizarProprietario() {
  return useAcaoSobreProprietarios<{ id: number; cadastro: ProprietarioRequest }>(
    'atualizar-proprietario',
    ({ id, cadastro }) => enviar<Proprietario>(`/proprietarios/${id}`, cadastro, 'PUT'),
  );
}

export function useDesativarProprietario() {
  return useAcaoSobreProprietarios<number>('desativar-proprietario', (id) =>
    enviar<Proprietario>(`/proprietarios/${id}/desativacao`),
  );
}

export function useReativarProprietario() {
  return useAcaoSobreProprietarios<number>('reativar-proprietario', (id) =>
    enviar<Proprietario>(`/proprietarios/${id}/reativacao`),
  );
}
