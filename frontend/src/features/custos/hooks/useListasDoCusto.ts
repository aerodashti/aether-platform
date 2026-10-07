import { useAeronaves } from '@/compartilhado/aeronaves/useAeronaves';
import { useVinculosVigentes } from '@/compartilhado/participacoes/useVinculosVigentes';
import { useProprietarios } from '@/compartilhado/proprietarios/useProprietarios';

import type { CustoResponse } from '../api/useCustos';
import { apoioDaAtribuicao } from '../componentes/apoiosDoCusto';
import {
  escolhaValida,
  opcoesDeAeronave,
  opcoesDeAtribuicao,
  situacaoDasListas,
} from '../componentes/opcoesDoCusto';
import type { RascunhoDoCusto } from '../componentes/rascunhoDoCusto';

/**
 * As listas de que o painel depende — frota, proprietários e vínculos vigentes — já traduzidas
 * para a tela: as opções de cada seleção, o que elas significam e o rascunho `efetivo`, em que um
 * id fora das opções vira vazio. O que a tela mostra é o que vai para o servidor.
 */
export function useListasDoCusto(custo: CustoResponse | undefined, rascunho: RascunhoDoCusto) {
  const aeronaves = useAeronaves();
  const proprietarios = useProprietarios();
  const vinculos = useVinculosVigentes();

  const opcoesDeAeronaves = opcoesDeAeronave(aeronaves.data, custo);
  const aeronaveId = escolhaValida(opcoesDeAeronaves, rascunho.aeronaveId);
  const opcoesDeDonos = opcoesDeAtribuicao({
    proprietarios: proprietarios.data,
    vinculos: vinculos.data,
    aeronaveId,
    custo,
  });
  const donos = situacaoDasListas(proprietarios, vinculos);
  const matricula = aeronaves.data?.find(
    (aeronave) => String(aeronave.id) === aeronaveId,
  )?.matricula;

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
      proprietarioId: escolhaValida(opcoesDeDonos, rascunho.proprietarioId),
    },
    opcoesDeAeronaves,
    opcoesDeDonos,
    donos,
    apoioDaAtribuicao: apoioDaAtribuicao({ donos, aeronaveId, matricula, vinculos: vinculos.data }),
    falharam: situacaoDasListas(aeronaves, proprietarios, vinculos) === 'falhou',
    recarregar,
  };
}
