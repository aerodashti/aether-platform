import { lerNumero, numeroParaCampo } from '@/compartilhado/formatacao/numero';
import type { SituacaoDaSoma } from '@/compartilhado/participacoes/percentuais';
import type { ProprietarioResponse } from '@/compartilhado/proprietarios/useProprietarios';
import type { CorDeIdentificacao } from '@/design-system/primitivos/SeletorDeCor';

import type { ContratoResponse, DefinirContratoRequest } from '../api/useContratos';

import { dividirIgualmente } from './rotulos';

/** Uma linha da edição: o proprietário e o percentual como o campo o mostra ("33,34"). */
export interface LinhaDoContrato {
  proprietarioId: number;
  nome: string;
  cor: CorDeIdentificacao;
  percentual: string;
}

export function linhasDoVigente(vigente: ContratoResponse | undefined): LinhaDoContrato[] {
  return (vigente?.participacoes ?? []).map((participacao) => ({
    proprietarioId: participacao.proprietarioId ?? 0,
    nome: participacao.nome ?? '',
    cor: (participacao.corDeIdentificacao ?? 'CINZA') as CorDeIdentificacao,
    percentual: numeroParaCampo(participacao.percentual),
  }));
}

export function alterarPercentual(
  linhas: LinhaDoContrato[],
  proprietarioId: number,
  percentual: string,
): LinhaDoContrato[] {
  return linhas.map((linha) =>
    linha.proprietarioId === proprietarioId ? { ...linha, percentual } : linha,
  );
}

/** Quem entra chega com o percentual vazio: o campo dele recebe o foco para ser preenchido. */
export function incluirLinha(
  linhas: LinhaDoContrato[],
  proprietario: ProprietarioResponse,
): LinhaDoContrato[] {
  return [
    ...linhas,
    {
      proprietarioId: proprietario.id ?? 0,
      nome: proprietario.nome ?? '',
      cor: (proprietario.corDeIdentificacao ?? 'CINZA') as CorDeIdentificacao,
      percentual: '',
    },
  ];
}

export function removerLinha(linhas: LinhaDoContrato[], proprietarioId: number): LinhaDoContrato[] {
  return linhas.filter((linha) => linha.proprietarioId !== proprietarioId);
}

/** 100% dividido com duas casas, o resto no primeiro: a soma fecha por construção. */
export function dividirEntreTodos(linhas: LinhaDoContrato[]): LinhaDoContrato[] {
  const partes = dividirIgualmente(linhas.length);
  return linhas.map((linha, indice) => ({
    ...linha,
    percentual: numeroParaCampo(partes[indice]),
  }));
}

/**
 * Quem recebe o foco quando uma linha sai: a seguinte, senão a anterior. Sem nenhuma, `undefined` —
 * a tela leva o foco à escolha de quem incluir.
 */
export function vizinhaDaRemovida(
  linhas: LinhaDoContrato[],
  proprietarioId: number,
): number | undefined {
  const indice = linhas.findIndex((linha) => linha.proprietarioId === proprietarioId);
  return (linhas[indice + 1] ?? linhas[indice - 1])?.proprietarioId;
}

/** Mesmos proprietários com os mesmos percentuais: salvar não arquivaria nada. */
export function mudaOContrato(
  linhas: LinhaDoContrato[],
  vigente: ContratoResponse | undefined,
): boolean {
  const atuais = vigente?.participacoes ?? [];
  if (atuais.length !== linhas.length) {
    return true;
  }
  return !linhas.every((linha) =>
    atuais.some(
      (participacao) =>
        participacao.proprietarioId === linha.proprietarioId &&
        participacao.percentual === lerNumero(linha.percentual),
    ),
  );
}

/** O pedido parte do vigente que a edição tinha à vista: se outro entrou em vigor, o servidor diz. */
export function pedidoDoContrato(
  linhas: LinhaDoContrato[],
  vigente: ContratoResponse | undefined,
): DefinirContratoRequest {
  return {
    contratoVigenteId: vigente?.id ?? null,
    participacoes: linhas.map((linha) => ({
      proprietarioId: linha.proprietarioId,
      percentual: lerNumero(linha.percentual),
    })),
  };
}

/** A frase da linha de soma: o que falta para fechar, ou o que salvar vai fazer. */
export function consequenciaDoSalvar(
  situacao: SituacaoDaSoma,
  muda: boolean,
  haVigente: boolean,
): string {
  if (!situacao.fecha) {
    return situacao.texto;
  }
  if (!muda) {
    return 'Fechado em 100%, sem alteração: o contrato atual continua valendo.';
  }
  return haVigente
    ? 'Fechado em 100%. Salvar cria um contrato novo e arquiva o atual no histórico.'
    : 'Fechado em 100%. Salvar define o primeiro contrato desta aeronave.';
}

/** Por que não sobra ninguém para incluir — e, com isso, o caminho para haver. */
export type SemCandidatos =
  | { motivo: 'nenhumCadastrado' }
  | { motivo: 'inativosDeFora'; nomes: string }
  | { motivo: 'todosNoContrato' };

/**
 * "Todos já estão no contrato" seria mentira para quem tem um sócio inativo fora dele: nesse caso,
 * a tela diz quem é e que reativar o cadastro o traz de volta.
 */
export function semCandidatos(
  cadastrados: ProprietarioResponse[],
  linhas: LinhaDoContrato[],
): SemCandidatos {
  if (cadastrados.length === 0) {
    return { motivo: 'nenhumCadastrado' };
  }
  const inativosDeFora = cadastrados.filter(
    (proprietario) =>
      proprietario.situacao !== 'ATIVO' &&
      !linhas.some((linha) => linha.proprietarioId === proprietario.id),
  );
  if (inativosDeFora.length > 0) {
    const nomes = inativosDeFora.map((proprietario) => proprietario.nome).join(', ');
    return { motivo: 'inativosDeFora', nomes };
  }
  return { motivo: 'todosNoContrato' };
}
