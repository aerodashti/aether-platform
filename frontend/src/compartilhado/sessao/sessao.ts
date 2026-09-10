import { useQuery } from '@tanstack/react-query';

import { buscar } from '@/api/cliente';
import type { components } from '@/api/tipos-gerados';

export type SessaoResponse = components['schemas']['SessaoResponse'];
export type PapelDoUsuario = NonNullable<SessaoResponse['papel']>;

/** Chave única da sessão no cache do Query: quem entra ou sai invalida exatamente esta. */
export const CHAVE_DA_SESSAO = ['sessao'] as const;

/**
 * Quem está na sessão corrente, ou nada.
 *
 * <p>Não há token para este código guardar: o cookie é `HttpOnly` e quem o anexa é o navegador.
 * Perguntar ao servidor é, portanto, a única forma de saber se há sessão — e é barato, porque a
 * resposta fica no cache do Query até alguém entrar ou sair.
 *
 * <p>`retry: false` é deliberado: 401 aqui não é falha de rede, é a resposta correta para quem
 * não está logado. Repetir três vezes só atrasaria a ida para a tela de entrada.
 */
export function useSessao() {
  const consulta = useQuery({
    queryKey: CHAVE_DA_SESSAO,
    queryFn: () => buscar<SessaoResponse>('/autenticacao/sessao'),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  return {
    usuario: consulta.data,
    carregando: consulta.isPending,
    autenticado: consulta.isSuccess,
    ehAdministrador: consulta.data?.papel === 'ADMINISTRADOR',
  };
}
