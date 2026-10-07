import { lerNumero, numeroParaCampo } from '@/compartilhado/formatacao/numero';
import type { VinculoVigenteResponse } from '@/compartilhado/participacoes/useVinculosVigentes';

import type { SaidaDeProprietario } from '../api/useProprietarios';

/** A participação de alguém no contrato novo, com o percentual como o campo o mostra ("33,33"). */
export interface ParticipacaoNova {
  proprietarioId: number;
  percentual: string;
  /** Entrou pelo painel. Só quem foi incluído aqui sai por aqui: os sócios atuais ficam. */
  incluida: boolean;
}

/** O contrato novo de uma aeronave, sem quem sai: os demais com a participação atual. */
export interface ContratoSemQuemSai {
  aeronaveId: number;
  /** O vigente de onde o painel partiu; o servidor recusa a saída se outro entrou no lugar. */
  contratoVigenteId: number | null;
  matricula: string;
  /** O percentual de quem sai, que precisa ir para alguém. */
  liberado: number;
  participacoes: ParticipacaoNova[];
}

/**
 * O ponto de partida do protótipo: cada aeronave de quem sai, com os demais proprietários na
 * participação atual — a soma fica abaixo de 100 pelo que ele tinha, e a pessoa distribui.
 */
export function contratosSemQuemSai(
  vinculos: VinculoVigenteResponse[],
  quemSai: number,
): ContratoSemQuemSai[] {
  const aeronavesDele = vinculos.filter((vinculo) => vinculo.proprietarioId === quemSai);
  return aeronavesDele.map((dele) => ({
    aeronaveId: dele.aeronaveId ?? 0,
    contratoVigenteId: dele.contratoId ?? null,
    matricula: dele.matricula ?? '',
    liberado: dele.percentual ?? 0,
    participacoes: vinculos
      .filter(
        (vinculo) => vinculo.aeronaveId === dele.aeronaveId && vinculo.proprietarioId !== quemSai,
      )
      .map((vinculo) => ({
        proprietarioId: vinculo.proprietarioId ?? 0,
        percentual: numeroParaCampo(vinculo.percentual),
        incluida: false,
      })),
  }));
}

export function alterarPercentual(
  contrato: ContratoSemQuemSai,
  proprietarioId: number,
  percentual: string,
): ContratoSemQuemSai {
  return {
    ...contrato,
    participacoes: contrato.participacoes.map((participacao) =>
      participacao.proprietarioId === proprietarioId
        ? { ...participacao, percentual }
        : participacao,
    ),
  };
}

export function incluirParticipacao(
  contrato: ContratoSemQuemSai,
  proprietarioId: number,
): ContratoSemQuemSai {
  return {
    ...contrato,
    participacoes: [...contrato.participacoes, { proprietarioId, percentual: '', incluida: true }],
  };
}

export function removerParticipacao(
  contrato: ContratoSemQuemSai,
  proprietarioId: number,
): ContratoSemQuemSai {
  return {
    ...contrato,
    participacoes: contrato.participacoes.filter(
      (participacao) => participacao.proprietarioId !== proprietarioId,
    ),
  };
}

/** A saída na ordem da tela: os índices do pedido são os do `campos` que o servidor devolve. */
export function pedidoDeSaida(
  proprietarioId: number,
  contratos: ContratoSemQuemSai[],
): SaidaDeProprietario {
  return {
    proprietarioId,
    contratos: contratos.map((contrato) => ({
      aeronaveId: contrato.aeronaveId,
      contratoVigenteId: contrato.contratoVigenteId,
      participacoes: contrato.participacoes.map((participacao) => ({
        proprietarioId: participacao.proprietarioId,
        percentual: lerNumero(participacao.percentual),
      })),
    })),
  };
}
