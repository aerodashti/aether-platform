import { useQuery } from '@tanstack/react-query';

import { buscar } from '@/api/cliente';
import type { components } from '@/api/tipos-gerados';

export type AeronaveResponse = components['schemas']['AeronaveResponse'];
export type SituacaoRegular = NonNullable<AeronaveResponse['situacaoRegular']>;
export type DocumentoDaAeronave = NonNullable<AeronaveResponse['documentoDoProximoVencimento']>;

const CHAVE = ['aeronaves'] as const;

/**
 * A frota inteira, sem paginação.
 *
 * <p>São dezenas de aeronaves, não milhares: paginar seria interface para um problema que ninguém
 * tem, e o protótipo não pagina esta tela. A situação regulatória vem calculada do servidor —
 * conformidade depende de "hoje" e de uma política, e duas pessoas não podem ver situações
 * diferentes para a mesma aeronave.
 */
export function useAeronaves() {
  return useQuery({
    queryKey: CHAVE,
    queryFn: () => buscar<AeronaveResponse[]>('/aeronaves'),
  });
}
