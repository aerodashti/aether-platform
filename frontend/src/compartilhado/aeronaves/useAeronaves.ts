import { useQuery } from '@tanstack/react-query';

import { buscar } from '@/api/cliente';
import type { components } from '@/api/tipos-gerados';

export type AeronaveResponse = components['schemas']['AeronaveResponse'];
export type SituacaoRegular = NonNullable<AeronaveResponse['situacaoRegular']>;
export type DocumentoDaAeronave = NonNullable<AeronaveResponse['documentoDoProximoVencimento']>;

/** Chave única da frota no cache do Query: as mutações do detalhe a invalidam. */
export const CHAVE_DA_FROTA = ['aeronaves'] as const;

/**
 * A frota inteira, sem paginação.
 *
 * <p>São dezenas de aeronaves, não milhares: paginar seria interface para um problema que ninguém
 * tem, e o protótipo não pagina esta tela. A situação regulatória vem calculada do servidor —
 * conformidade depende de "hoje" e de uma política, e duas pessoas não podem ver situações
 * diferentes para a mesma aeronave.
 *
 * <p>Mora em `compartilhado` porque duas telas a usam: a frota e o filtro do diário de voos.
 */
export function useAeronaves() {
  return useQuery({
    queryKey: CHAVE_DA_FROTA,
    queryFn: () => buscar<AeronaveResponse[]>('/aeronaves'),
  });
}
