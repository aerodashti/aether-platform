import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { buscar, enviar } from '@/api/cliente';
import type { components } from '@/api/tipos-gerados';
import { contexto } from '@/compartilhado/observabilidade/observabilidade';

export type AvisosResponse = components['schemas']['AvisosResponse'];
export type AvisoResponse = components['schemas']['AvisoResponse'];
export type CategoriaDoAviso = NonNullable<AvisoResponse['categoria']>;

const CHAVE = ['avisos'] as const;

/**
 * Os avisos da frota, derivados no servidor a cada leitura. O sino da casca e a Central leem o
 * mesmo cache; um minuto de frescor basta — vencimento não muda de um segundo para o outro, e o
 * sino está em toda tela.
 */
export function useAvisos() {
  return useQuery({
    queryKey: CHAVE,
    queryFn: () => buscar<AvisosResponse>('/avisos'),
    staleTime: 60_000,
  });
}

export function useMarcarLeitura() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: ({ chaves, lido }: { chaves: string[]; lido: boolean }) =>
      contexto.interacao(lido ? 'marcar-avisos-lidos' : 'marcar-avisos-nao-lidos', () => {
        contexto.registrar('avisos.quantidade', chaves.length);
        return enviar<void>('/avisos/leitura', { chaves, lido }, 'PUT');
      }),
    onSuccess: () => void cliente.invalidateQueries({ queryKey: CHAVE }),
  });
}
