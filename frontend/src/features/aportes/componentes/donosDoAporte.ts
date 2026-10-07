import type { VinculoVigenteResponse } from '@/compartilhado/participacoes/useVinculosVigentes';
import type { ProprietarioResponse } from '@/compartilhado/proprietarios/useProprietarios';
import type { OpcaoDeSelecao } from '@/design-system/primitivos/Selecao';

import type { AporteResponse } from '../api/useAportes';

/**
 * Em que pé está a lista de quem pode aportar na aeronave escolhida — cada situação pede um texto
 * diferente na tela, e "sem contrato" não pode ser confundido com "ainda carregando".
 */
export type SituacaoDosDonos = 'carregando' | 'falhou' | 'semContrato' | 'pronta';

/**
 * Os proprietários do contrato vigente da aeronave. Quem saiu do contrato ainda pode aportar pelo
 * servidor, mas é exceção, e aparece aqui só ao corrigir um aporte dele.
 */
export function donosDaAeronave(
  vinculos: VinculoVigenteResponse[] | undefined,
  proprietarios: ProprietarioResponse[] | undefined,
  aeronaveId: string,
  aporte: AporteResponse | undefined,
): OpcaoDeSelecao[] {
  const nomes = new Map((proprietarios ?? []).map((dono) => [dono.id, dono.nome ?? '']));
  const opcoes = (vinculos ?? [])
    .filter((vinculo) => String(vinculo.aeronaveId) === aeronaveId)
    .map((vinculo) => ({
      valor: String(vinculo.proprietarioId),
      rotulo: nomes.get(vinculo.proprietarioId) ?? '',
    }));
  const atual = aporte?.proprietarioId == null ? '' : String(aporte.proprietarioId);
  const naMesmaAeronave = String(aporte?.aeronaveId) === aeronaveId;
  if (atual !== '' && naMesmaAeronave && !opcoes.some((opcao) => opcao.valor === atual)) {
    opcoes.push({ valor: atual, rotulo: aporte?.nomeDoProprietario ?? '' });
  }
  return opcoes;
}

export function situacaoDosDonos({
  carregando,
  falhou,
  quantidade,
}: {
  carregando: boolean;
  falhou: boolean;
  quantidade: number;
}): SituacaoDosDonos {
  if (falhou) {
    return 'falhou';
  }
  if (carregando) {
    return 'carregando';
  }
  return quantidade === 0 ? 'semContrato' : 'pronta';
}

const PRIMEIRA_OPCAO: Record<SituacaoDosDonos, string> = {
  carregando: 'Carregando os proprietários…',
  falhou: 'Lista de proprietários indisponível',
  semContrato: 'Nenhum proprietário no contrato',
  pronta: 'Selecione…',
};

/**
 * As opções da seleção: a primeira diz por que está vazia, quando está. Dono sem nome é o que a
 * lista de proprietários ainda não trouxe — uma opção em branco não diz quem é.
 */
export function opcoesDoProprietario(
  aeronaveId: string,
  situacao: SituacaoDosDonos,
  donos: OpcaoDeSelecao[],
): OpcaoDeSelecao[] {
  if (aeronaveId === '') {
    return [{ valor: '', rotulo: 'Escolha a aeronave primeiro' }];
  }
  return [
    { valor: '', rotulo: PRIMEIRA_OPCAO[situacao] },
    ...donos.filter((dono) => dono.rotulo !== ''),
  ];
}
