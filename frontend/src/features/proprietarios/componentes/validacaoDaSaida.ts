import type { Erros } from '@/compartilhado/formulario/useValidacao';
import { erroDaParticipacao, erroDaSoma } from '@/compartilhado/participacoes/percentuais';

import type { ContratoSemQuemSai } from './rebalanceamento';

/** Os nomes do JSON da saída: o `campos` do 400 cai na aeronave e na linha certas. */
export type CampoDaSaida =
  `contratos[${number}].participacoes` | `contratos[${number}].participacoes[${number}].percentual`;

export function campoDaSoma(contrato: number): CampoDaSaida {
  return `contratos[${contrato}].participacoes`;
}

export function campoDoPercentual(contrato: number, participacao: number): CampoDaSaida {
  return `contratos[${contrato}].participacoes[${participacao}].percentual`;
}

/** O que dizer quando ninguém ficou no contrato novo de uma aeronave. */
export function semNinguemNa(matricula: string): string {
  return `Inclua quem assume a participação na ${matricula}.`;
}

/** As regras do `ContratoNovo`: cada percentual de 0,01 a 100 e cada aeronave fechando 100. */
export function validarSaida(contratos: ContratoSemQuemSai[]): Erros<CampoDaSaida> {
  const erros: Erros<CampoDaSaida> = {};
  contratos.forEach((contrato, indice) => {
    contrato.participacoes.forEach((participacao, posicao) => {
      erros[campoDoPercentual(indice, posicao)] = erroDaParticipacao(participacao.percentual);
    });
    erros[campoDaSoma(indice)] = erroDaSoma(
      contrato.participacoes.map((participacao) => participacao.percentual),
      semNinguemNa(contrato.matricula),
    );
  });
  return erros;
}

/** Na ordem da tela: aeronave por aeronave, as linhas e depois a soma dela. */
export function rotulosDaSaida(
  contratos: ContratoSemQuemSai[],
  nomes: Map<number, string>,
): Record<CampoDaSaida, string> {
  const rotulos = {} as Record<CampoDaSaida, string>;
  contratos.forEach((contrato, indice) => {
    contrato.participacoes.forEach((participacao, posicao) => {
      rotulos[campoDoPercentual(indice, posicao)] =
        `Participação de ${nomes.get(participacao.proprietarioId) ?? ''} na ${contrato.matricula}`;
    });
    rotulos[campoDaSoma(indice)] = `Soma da ${contrato.matricula}`;
  });
  return rotulos;
}

/**
 * O que, mudando, apaga o erro que o servidor deu ao campo. A linha leva o proprietário junto:
 * remover alguém desloca os índices, e o erro não pode passar para quem ficou no lugar dele.
 */
export function valoresDaSaida(contratos: ContratoSemQuemSai[]): Record<CampoDaSaida, unknown> {
  const valores = {} as Record<CampoDaSaida, unknown>;
  contratos.forEach((contrato, indice) => {
    const porLinha = contrato.participacoes.map(
      (participacao) => `${participacao.proprietarioId}:${participacao.percentual}`,
    );
    porLinha.forEach((valor, posicao) => {
      valores[campoDoPercentual(indice, posicao)] = valor;
    });
    valores[campoDaSoma(indice)] = porLinha.join('|');
  });
  return valores;
}

const LINHA_NO_SERVIDOR = /^contratos\[(\d+)\]\.participacoes\[(\d+)\]/;
const CONTRATO_NO_SERVIDOR = /^contratos\[(\d+)\]/;

/**
 * O campo da tela que responde por um nome do `campos` do 400. A recusa de uma linha cai no
 * percentual dela; a do contrato da aeronave (a lista vazia, a aeronave repetida), na soma dela.
 */
export function campoDaSaidaNoServidor(
  nome: string,
  contratos: ContratoSemQuemSai[],
): CampoDaSaida | undefined {
  const linha = LINHA_NO_SERVIDOR.exec(nome);
  if (linha) {
    const [indice, posicao] = [Number(linha[1]), Number(linha[2])];
    const existe = posicao < (contratos[indice]?.participacoes.length ?? 0);
    return existe ? campoDoPercentual(indice, posicao) : undefined;
  }
  const contrato = CONTRATO_NO_SERVIDOR.exec(nome);
  if (contrato) {
    const indice = Number(contrato[1]);
    return indice < contratos.length ? campoDaSoma(indice) : undefined;
  }
  return undefined;
}
