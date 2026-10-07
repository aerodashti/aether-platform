import { useAeronaves } from '@/compartilhado/aeronaves/useAeronaves';
import { useVinculosVigentes } from '@/compartilhado/participacoes/useVinculosVigentes';
import { useProprietarios } from '@/compartilhado/proprietarios/useProprietarios';

import type { TrocaResponse } from '../api/useTrocas';
import {
  apoioDosProprietarios,
  escolhaValida,
  opcoesDeAeronave,
  proprietariosDaTroca,
  situacaoDasListas,
} from '../componentes/opcoesDaTroca';
import type { RascunhoDaTroca } from '../componentes/rascunhoDaTroca';

/**
 * As listas de que o painel depende — frota, proprietários e vínculos vigentes — já traduzidas
 * para a tela: as opções de cada seleção, o que elas significam e o rascunho `efetivo`, em que um
 * id fora das opções vira vazio. O que a tela mostra é o que vai para o servidor.
 */
export function useListasDaTroca(troca: TrocaResponse | undefined, rascunho: RascunhoDaTroca) {
  const aeronaves = useAeronaves();
  const proprietarios = useProprietarios();
  const vinculos = useVinculosVigentes();

  const situacaoDosDonos = situacaoDasListas(proprietarios, vinculos);
  const opcoesDeAeronaves = opcoesDeAeronave(aeronaves.data, troca);
  const aeronaveId = escolhaValida(opcoesDeAeronaves, rascunho.aeronaveId);
  const opcoesDeCedente = proprietariosDaTroca({
    vinculos: situacaoDosDonos === 'pronta' ? vinculos.data : undefined,
    proprietarios: proprietarios.data,
    aeronaveId,
    troca,
  });
  const cedenteId = escolhaValida(opcoesDeCedente, rascunho.cedenteId);
  // Ceder a si mesmo não é troca: quem cedeu sai das opções de quem recebeu.
  const opcoesDeRecebedor = opcoesDeCedente.filter((opcao) => opcao.valor !== cedenteId);
  const matricula =
    aeronaves.data?.find((aeronave) => String(aeronave.id) === aeronaveId)?.matricula ??
    troca?.matricula;

  function recarregar() {
    for (const consulta of [aeronaves, proprietarios, vinculos]) {
      if (consulta.isError) {
        void consulta.refetch();
      }
    }
  }

  return {
    efetivo: {
      ...rascunho,
      aeronaveId,
      cedenteId,
      recebedorId: escolhaValida(opcoesDeRecebedor, rascunho.recebedorId),
    },
    opcoesDeAeronaves,
    opcoesDeCedente,
    opcoesDeRecebedor,
    carregandoAeronaves: aeronaves.isPending,
    proprietarios: situacaoDosDonos,
    proprietariosDisponiveis: opcoesDeCedente.length,
    apoioDosProprietarios: apoioDosProprietarios({
      aeronaveId,
      matricula,
      situacao: situacaoDosDonos,
      disponiveis: opcoesDeCedente.length,
    }),
    falharam: situacaoDasListas(aeronaves, proprietarios, vinculos) === 'falhou',
    recarregar,
  };
}
