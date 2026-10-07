import { MutationCache, QueryClient } from '@tanstack/react-query';

import { CHAVE_DOS_AVISOS } from '@/compartilhado/avisos/useAvisos';

/**
 * O cliente do Query da aplicação. Estado de servidor é do Query; estado de UI fica em useState ou
 * contexto local. Sem store global.
 *
 * <p>Os avisos derivam de quase tudo — contadores, manutenção, tripulação, vencimentos, fundo,
 * antecedência —, então qualquer escrita bem-sucedida os invalida. Enumerar as mutações que os
 * afetam esqueceria uma, e o sino ficaria mentindo por um minuto.
 */
export function criarClienteDeConsultas(): QueryClient {
  const cliente: QueryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: 1, refetchOnWindowFocus: false },
    },
    mutationCache: new MutationCache({
      onSuccess: () => void cliente.invalidateQueries({ queryKey: CHAVE_DOS_AVISOS }),
    }),
  });
  return cliente;
}
