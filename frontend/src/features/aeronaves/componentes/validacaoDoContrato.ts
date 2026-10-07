import type { Erros } from '@/compartilhado/formulario/useValidacao';
import { erroDaParticipacao, erroDaSoma } from '@/compartilhado/participacoes/percentuais';

import type { LinhaDoContrato } from './contratoEmEdicao';

/** Os nomes do JSON do pedido: o `campos` do 400 cai na linha certa sem tradução. */
export type CampoDoContrato = 'participacoes' | `participacoes[${number}].percentual`;

export const SEM_PROPRIETARIO = 'Adicione ao menos um proprietário ao contrato.';

export function campoDoPercentual(indice: number): CampoDoContrato {
  return `participacoes[${indice}].percentual`;
}

/** As regras do `DefinirContratoRequest`: cada percentual de 0,01 a 100 e a lista fechando 100. */
export function validarContrato(linhas: LinhaDoContrato[]): Erros<CampoDoContrato> {
  const erros: Erros<CampoDoContrato> = {};
  linhas.forEach((linha, indice) => {
    erros[campoDoPercentual(indice)] = erroDaParticipacao(linha.percentual);
  });
  erros.participacoes = erroDaSoma(
    linhas.map((linha) => linha.percentual),
    SEM_PROPRIETARIO,
  );
  return erros;
}

/** Na ordem da tela: as linhas, e a soma por último. */
export function rotulosDoContrato(linhas: LinhaDoContrato[]): Record<CampoDoContrato, string> {
  const rotulos = {} as Record<CampoDoContrato, string>;
  linhas.forEach((linha, indice) => {
    rotulos[campoDoPercentual(indice)] = `Participação de ${linha.nome}`;
  });
  rotulos.participacoes = 'Soma das participações';
  return rotulos;
}

/**
 * O que, mudando, apaga o erro que o servidor deu ao campo. A linha leva o proprietário junto:
 * remover alguém desloca os índices, e o erro não pode passar para quem ficou no lugar dele.
 */
export function valoresDoContrato(linhas: LinhaDoContrato[]): Record<CampoDoContrato, unknown> {
  const porLinha = linhas.map((linha) => `${linha.proprietarioId}:${linha.percentual}`);
  const valores = {} as Record<CampoDoContrato, unknown>;
  porLinha.forEach((valor, indice) => {
    valores[campoDoPercentual(indice)] = valor;
  });
  valores.participacoes = porLinha.join('|');
  return valores;
}

const LINHA_NO_SERVIDOR = /^participacoes\[(\d+)\]/;

/**
 * O campo da tela que responde por um nome do `campos` do 400. Qualquer recusa de uma linha
 * (`participacoes[1].proprietarioId`, `participacoes[1]`) é mostrada no percentual dela, o único
 * campo que a linha tem.
 */
export function campoDoContratoNoServidor(
  nome: string,
  quantidadeDeLinhas: number,
): CampoDoContrato | undefined {
  if (nome === 'participacoes') {
    return 'participacoes';
  }
  const linha = LINHA_NO_SERVIDOR.exec(nome);
  if (!linha) {
    return undefined;
  }
  const indice = Number(linha[1]);
  return indice < quantidadeDeLinhas ? campoDoPercentual(indice) : undefined;
}
