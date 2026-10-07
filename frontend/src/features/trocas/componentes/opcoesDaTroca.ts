import type { AeronaveResponse } from '@/compartilhado/aeronaves/useAeronaves';
import type { VinculoVigenteResponse } from '@/compartilhado/participacoes/useVinculosVigentes';
import type { ProprietarioResponse } from '@/compartilhado/proprietarios/useProprietarios';
import type { OpcaoDeSelecao } from '@/design-system/primitivos/Selecao';

import type { TrocaResponse } from '../api/useTrocas';

/** Em que pé está uma lista de que o painel depende. */
export type SituacaoDaLista = 'carregando' | 'falhou' | 'pronta';

interface EstadoDaConsulta {
  isPending: boolean;
  isError: boolean;
}

/** Uma falha basta para a lista não servir; senão, qualquer uma pendente a deixa carregando. */
export function situacaoDasListas(...consultas: EstadoDaConsulta[]): SituacaoDaLista {
  if (consultas.some((consulta) => consulta.isError)) {
    return 'falhou';
  }
  return consultas.some((consulta) => consulta.isPending) ? 'carregando' : 'pronta';
}

/** O valor escolhido, se ainda está entre as opções; senão vazio — a tela mostra o que envia. */
export function escolhaValida(opcoes: OpcaoDeSelecao[], valor: string): string {
  return opcoes.some((opcao) => opcao.valor === valor) ? valor : '';
}

function rotuloDaAeronave(matricula: string | undefined, modelo: string | undefined): string {
  return `${matricula ?? ''} — ${modelo ?? ''}`;
}

/** A frota; na correção, a aeronave da troca entra mesmo que a lista não a traga. */
export function opcoesDeAeronave(
  aeronaves: AeronaveResponse[] | undefined,
  troca: TrocaResponse | undefined,
): OpcaoDeSelecao[] {
  const opcoes = (aeronaves ?? []).map((aeronave) => ({
    valor: String(aeronave.id),
    rotulo: rotuloDaAeronave(aeronave.matricula, aeronave.modelo),
  }));
  if (
    troca?.aeronaveId != null &&
    !opcoes.some((opcao) => opcao.valor === String(troca.aeronaveId))
  ) {
    opcoes.push({
      valor: String(troca.aeronaveId),
      rotulo: rotuloDaAeronave(troca.matricula, troca.modelo),
    });
  }
  return opcoes;
}

interface FontesDosProprietarios {
  /** Só com proprietários e vínculos carregados: antes disso, os nomes ainda não existem. */
  vinculos: VinculoVigenteResponse[] | undefined;
  proprietarios: ProprietarioResponse[] | undefined;
  aeronaveId: string;
  troca: TrocaResponse | undefined;
}

/**
 * Quem pode ceder ou receber: os donos do contrato vigente da aeronave e, na correção, os da
 * própria troca — quem já saiu do contrato ainda troca pelo servidor, mas é exceção.
 */
export function proprietariosDaTroca({
  vinculos,
  proprietarios,
  aeronaveId,
  troca,
}: FontesDosProprietarios): OpcaoDeSelecao[] {
  const nomes = new Map((proprietarios ?? []).map((dono) => [dono.id, dono.nome]));
  const opcoes = (vinculos ?? [])
    .filter((vinculo) => String(vinculo.aeronaveId) === aeronaveId)
    .map((vinculo) => ({
      valor: String(vinculo.proprietarioId),
      rotulo: nomes.get(vinculo.proprietarioId) ?? `Proprietário nº ${vinculo.proprietarioId}`,
    }));
  const daTroca = String(troca?.aeronaveId) === aeronaveId;
  for (const [id, nome] of [
    [troca?.cedenteId, troca?.nomeDoCedente],
    [troca?.recebedorId, troca?.nomeDoRecebedor],
  ] as const) {
    if (daTroca && id != null && !opcoes.some((opcao) => opcao.valor === String(id))) {
      opcoes.push({ valor: String(id), rotulo: nome ?? `Proprietário nº ${id}` });
    }
  }
  return opcoes;
}

interface SituacaoDosProprietarios {
  aeronaveId: string;
  matricula: string | undefined;
  situacao: SituacaoDaLista;
  disponiveis: number;
}

/**
 * O apoio de "Cedeu": de onde vêm as opções e, quando não há nenhuma a escolher, por quê — sem
 * isso, uma aeronave sem contrato deixa as duas seleções só com "Selecione…".
 */
export function apoioDosProprietarios({
  aeronaveId,
  matricula,
  situacao,
  disponiveis,
}: SituacaoDosProprietarios): string {
  if (aeronaveId === '') {
    return 'Escolha a aeronave para ver os proprietários do contrato.';
  }
  if (situacao === 'carregando') {
    return 'Carregando os proprietários do contrato…';
  }
  if (situacao === 'falhou') {
    return 'A lista de proprietários não carregou.';
  }
  return disponiveis < 2
    ? `A ${matricula ?? 'aeronave'} não tem dois proprietários no contrato vigente: cadastre o contrato antes de registrar a troca.`
    : 'Proprietários do contrato vigente da aeronave.';
}
