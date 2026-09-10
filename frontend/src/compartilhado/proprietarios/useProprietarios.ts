import { useQuery } from '@tanstack/react-query';

import { buscar } from '@/api/cliente';
import type { components } from '@/api/tipos-gerados';

export type ProprietarioResponse = components['schemas']['ProprietarioResponse'];
export type SituacaoDoProprietario = NonNullable<ProprietarioResponse['situacao']>;

/** Chave única da lista no cache do Query: as mutações da tela de Proprietários a invalidam. */
export const CHAVE_DE_PROPRIETARIOS = ['proprietarios'] as const;

/**
 * A lista completa, sem paginação nem filtro no servidor: os proprietários são poucas dezenas por
 * conta, e o recorte é de quem consome — a decisão está registrada no `ProprietarioRepository`.
 *
 * <p>Mora em `compartilhado` porque duas telas a usam: a de Proprietários e o contrato de
 * participações no detalhe da aeronave.
 */
export function useProprietarios() {
  return useQuery({
    queryKey: CHAVE_DE_PROPRIETARIOS,
    queryFn: () => buscar<ProprietarioResponse[]>('/proprietarios'),
  });
}
