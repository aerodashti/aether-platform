import type { AeronaveResponse } from '@/compartilhado/aeronaves/useAeronaves';
import {
  podeReceberAtribuicao,
  type VinculoVigenteResponse,
} from '@/compartilhado/participacoes/useVinculosVigentes';
import type { ProprietarioResponse } from '@/compartilhado/proprietarios/useProprietarios';
import type { OpcaoDeSelecao } from '@/design-system/primitivos/Selecao';

import type { CustoResponse } from '../api/useCustos';

import { ATRIBUICAO_RATEADA } from './rotulos';

export type SituacaoDaLista = 'carregando' | 'falhou' | 'pronta';

/** Uma lista que depende de várias consultas só está pronta quando todas estão. */
export function situacaoDasListas(
  ...consultas: Array<{ isPending: boolean; isError: boolean }>
): SituacaoDaLista {
  if (consultas.some((consulta) => consulta.isError)) {
    return 'falhou';
  }
  return consultas.some((consulta) => consulta.isPending) ? 'carregando' : 'pronta';
}

/**
 * O valor escolhido, se ele está entre as opções; senão, vazio. O `<select>` mostra a primeira
 * opção quando o valor não está na lista — sem isto, a tela mostraria "Selecione…" e o envio
 * levaria o id de uma aeronave que veio crua da URL.
 */
export function escolhaValida(opcoes: OpcaoDeSelecao[], valor: string): string {
  return opcoes.some((opcao) => opcao.valor === valor) ? valor : '';
}

/** A frota, e a aeronave do lançamento em correção mesmo que a lista não tenha carregado. */
export function opcoesDeAeronave(
  aeronaves: AeronaveResponse[] | undefined,
  custo: CustoResponse | undefined,
): OpcaoDeSelecao[] {
  const opcoes = (aeronaves ?? []).map((aeronave) => ({
    valor: String(aeronave.id),
    rotulo: `${aeronave.matricula} — ${aeronave.modelo}`,
  }));
  const doLancamento = custo?.aeronaveId == null ? '' : String(custo.aeronaveId);
  const faltaADoLancamento =
    doLancamento !== '' && !opcoes.some((opcao) => opcao.valor === doLancamento);
  return [
    { valor: '', rotulo: 'Selecione…' },
    ...opcoes,
    ...(faltaADoLancamento ? [{ valor: doLancamento, rotulo: custo?.matricula ?? '—' }] : []),
  ];
}

interface EntradaDaAtribuicao {
  proprietarios: ProprietarioResponse[] | undefined;
  vinculos: VinculoVigenteResponse[] | undefined;
  aeronaveId: string;
  /** O lançamento em correção: a atribuição gravada continua escolhível, mesmo inativa. */
  custo: CustoResponse | undefined;
}

/**
 * O rateio e os donos da aeronave que estão ativos. Na correção, quem já paga o lançamento segue
 * na lista — marcado "(inativo)" se saiu da aeronave —, para a correção não trocar o dono do
 * histórico.
 */
export function opcoesDeAtribuicao({
  proprietarios,
  vinculos,
  aeronaveId,
  custo,
}: EntradaDaAtribuicao): OpcaoDeSelecao[] {
  const atual = custo?.proprietarioId == null ? '' : String(custo.proprietarioId);
  const podeReceber = podeReceberAtribuicao(vinculos, aeronaveId, atual);
  const donos = (proprietarios ?? [])
    .filter(
      (dono) => podeReceber(dono.id) && (dono.situacao === 'ATIVO' || String(dono.id) === atual),
    )
    .map((dono) => ({
      valor: String(dono.id),
      rotulo: dono.situacao === 'ATIVO' ? (dono.nome ?? '') : `${dono.nome ?? ''} (inativo)`,
    }));
  const faltaAAtual = atual !== '' && !donos.some((dono) => dono.valor === atual);
  return [
    { valor: '', rotulo: ATRIBUICAO_RATEADA },
    ...donos,
    ...(faltaAAtual ? [{ valor: atual, rotulo: custo?.nomeDoProprietario ?? '—' }] : []),
  ];
}
