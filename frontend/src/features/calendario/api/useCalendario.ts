import { useQuery } from '@tanstack/react-query';

import { buscar } from '@/api/cliente';
import type { components } from '@/api/tipos-gerados';

type DiarioDeVoosResponse = components['schemas']['DiarioDeVoosResponse'];
type PainelDeManutencaoResponse = components['schemas']['PainelDeManutencaoResponse'];
export type TrechoDoCalendario = components['schemas']['TrechoResponse'];
export type ManutencaoDoCalendario = components['schemas']['ManutencaoResponse'];

/**
 * O calendário é uma visualização sobre duas fontes que já existem: o diário de voos da
 * competência e as manutenções programadas da aeronave. Nenhum endpoint próprio — a tela é
 * leitura composta, e as duas consultas ficam em cache separado, invalidadas pelas telas donas.
 */
export function useCalendario(aeronaveId: string, competencia: string) {
  const voos = useQuery({
    queryKey: ['voos', { aeronaveId, competencia }],
    queryFn: () =>
      buscar<DiarioDeVoosResponse>(`/voos?aeronave=${aeronaveId}&competencia=${competencia}`),
    enabled: aeronaveId !== '',
    placeholderData: (anterior) => anterior,
  });
  const manutencao = useQuery({
    queryKey: ['manutencao', aeronaveId],
    queryFn: () => buscar<PainelDeManutencaoResponse>(`/manutencoes?aeronave=${aeronaveId}`),
    enabled: aeronaveId !== '',
    placeholderData: (anterior) => anterior,
  });

  const trechosPorDia = new Map<string, TrechoDoCalendario[]>();
  for (const trecho of voos.data?.trechos ?? []) {
    if (trecho.data) {
      trechosPorDia.set(trecho.data, [...(trechosPorDia.get(trecho.data) ?? []), trecho]);
    }
  }

  const manutencoesPorDia = new Map<string, ManutencaoDoCalendario[]>();
  for (const manutencao_ of manutencao.data?.programadas ?? []) {
    if (manutencao_.data?.startsWith(competencia)) {
      manutencoesPorDia.set(manutencao_.data, [
        ...(manutencoesPorDia.get(manutencao_.data) ?? []),
        manutencao_,
      ]);
    }
  }

  return {
    trechosPorDia,
    manutencoesPorDia,
    isError: voos.isError || manutencao.isError,
    refetch: async () => {
      await Promise.all([voos.refetch(), manutencao.refetch()]);
    },
  };
}
