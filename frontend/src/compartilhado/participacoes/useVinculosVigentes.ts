import { useQuery } from '@tanstack/react-query';

import { buscar } from '@/api/cliente';
import type { components } from '@/api/tipos-gerados';

export type VinculoVigenteResponse = components['schemas']['VinculoVigenteResponse'];

/** Chave da lista de vínculos vigentes no cache; o contrato da aeronave a invalida ao mudar. */
export const CHAVE_DE_VINCULOS_VIGENTES = ['participacoes', 'vigentes'] as const;

/**
 * As participações de todos os contratos vigentes, numa chamada só: a grade de proprietários
 * agrupa por proprietário e desenha uma barra por aeronave. Vem do lado da participação, não do
 * proprietário, porque é o contrato que sabe quem é dono de quanto.
 */
export function useVinculosVigentes() {
  return useQuery({
    queryKey: CHAVE_DE_VINCULOS_VIGENTES,
    queryFn: () => buscar<VinculoVigenteResponse[]>('/participacoes/vigentes'),
  });
}

/** Os vínculos de cada proprietário, na ordem em que o servidor os devolve (matrícula, fatia). */
export function agruparPorProprietario(
  vinculos: VinculoVigenteResponse[] | undefined,
): Map<number, VinculoVigenteResponse[]> {
  const grupos = new Map<number, VinculoVigenteResponse[]>();
  for (const vinculo of vinculos ?? []) {
    const id = vinculo.proprietarioId ?? 0;
    grupos.set(id, [...(grupos.get(id) ?? []), vinculo]);
  }
  return grupos;
}

/** Quantos proprietários cada aeronave tem no contrato vigente — o número do cartão da frota. */
export function contarProprietariosPorAeronave(
  vinculos: VinculoVigenteResponse[] | undefined,
): Map<number, number> {
  const contagem = new Map<number, number>();
  for (const vinculo of vinculos ?? []) {
    const id = vinculo.aeronaveId ?? 0;
    contagem.set(id, (contagem.get(id) ?? 0) + 1);
  }
  return contagem;
}
