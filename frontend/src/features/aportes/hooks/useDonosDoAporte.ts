import { useVinculosVigentes } from '@/compartilhado/participacoes/useVinculosVigentes';
import { useProprietarios } from '@/compartilhado/proprietarios/useProprietarios';

import type { AporteResponse } from '../api/useAportes';
import { donosDaAeronave, situacaoDosDonos } from '../componentes/donosDoAporte';

/**
 * Quem pode aportar na aeronave escolhida, e em que pé está essa lista: carregando, falhou, sem
 * contrato ou pronta. Junta os vínculos do contrato vigente com os nomes dos proprietários.
 */
export function useDonosDoAporte(aeronaveId: string, aporte: AporteResponse | undefined) {
  const vinculos = useVinculosVigentes();
  const proprietarios = useProprietarios();
  const donos = donosDaAeronave(vinculos.data, proprietarios.data, aeronaveId, aporte);
  const situacao = situacaoDosDonos({
    carregando: vinculos.isPending || proprietarios.isPending,
    falhou: vinculos.isError || proprietarios.isError,
    quantidade: donos.length,
  });

  function recarregar() {
    void vinculos.refetch();
    void proprietarios.refetch();
  }

  return { donos, situacao, recarregar };
}
