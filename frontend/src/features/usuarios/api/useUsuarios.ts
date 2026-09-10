import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { buscar, enviar } from '@/api/cliente';
import type { components } from '@/api/tipos-gerados';
import { contexto } from '@/compartilhado/observabilidade/observabilidade';
import type { PapelDoUsuario } from '@/compartilhado/sessao/sessao';

export type UsuarioResponse = components['schemas']['UsuarioResponse'];
export type PaginaDeUsuarios = components['schemas']['PaginaDeUsuariosResponse'];
export type ConvidarUsuarioRequest = components['schemas']['ConvidarUsuarioRequest'];
export type SituacaoDoUsuario = NonNullable<UsuarioResponse['situacao']>;

export interface FiltroDeUsuarios {
  busca: string;
  papel: PapelDoUsuario | '';
  situacao: SituacaoDoUsuario | '';
  pagina: number;
}

export const TAMANHO_DA_PAGINA = 20;

const CHAVE = ['usuarios'] as const;

/** Só os filtros preenchidos entram na URL: parâmetro vazio e parâmetro ausente não são o mesmo. */
function consulta(filtro: FiltroDeUsuarios): string {
  const parametros = new URLSearchParams();
  if (filtro.busca.trim()) {
    parametros.set('busca', filtro.busca.trim());
  }
  if (filtro.papel) {
    parametros.set('papel', filtro.papel);
  }
  if (filtro.situacao) {
    parametros.set('situacao', filtro.situacao);
  }
  parametros.set('page', String(filtro.pagina));
  parametros.set('size', String(TAMANHO_DA_PAGINA));
  return parametros.toString();
}

export function useUsuarios(filtro: FiltroDeUsuarios) {
  return useQuery({
    queryKey: [...CHAVE, filtro],
    queryFn: () => buscar<PaginaDeUsuarios>(`/usuarios?${consulta(filtro)}`),
    // Mantém a página anterior visível enquanto a nova chega: sem isto, digitar na busca faz a
    // grade piscar para vazio a cada tecla.
    placeholderData: (anterior) => anterior,
  });
}

/**
 * As quatro ações da tela. Todas invalidam a lista inteira, e não só a linha alterada: convidar
 * acrescenta uma linha que pode cair em outra página, e desativar muda a situação que é filtro —
 * remendar o cache item a item erraria a contagem e o recorte.
 */
function useAcaoSobreUsuarios<T>(nome: string, acao: (entrada: T) => Promise<unknown>) {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (entrada: T) => contexto.interacao(nome, () => acao(entrada)),
    onSuccess: () => cliente.invalidateQueries({ queryKey: CHAVE }),
  });
}

export function useConvidarUsuario() {
  return useAcaoSobreUsuarios<ConvidarUsuarioRequest>('convidar-usuario', (convite) =>
    enviar<UsuarioResponse>('/usuarios', convite),
  );
}

export function useReenviarConvite() {
  return useAcaoSobreUsuarios<number>('reenviar-convite', (id) =>
    enviar<void>(`/usuarios/${id}/convite`),
  );
}

export function useDesativarUsuario() {
  return useAcaoSobreUsuarios<number>('desativar-usuario', (id) =>
    enviar<UsuarioResponse>(`/usuarios/${id}/desativacao`),
  );
}

export function useReativarUsuario() {
  return useAcaoSobreUsuarios<number>('reativar-usuario', (id) =>
    enviar<UsuarioResponse>(`/usuarios/${id}/reativacao`),
  );
}
