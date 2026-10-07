import { lerNumero } from '@/compartilhado/formatacao/numero';
import { percentualEmTexto } from '@/compartilhado/formatacao/percentual';
import { numero, obrigatorio, primeiraFalha } from '@/compartilhado/formulario/regras';

/**
 * Os limites de uma participação, os mesmos do `ParticipacaoRequest` no servidor: maior que zero,
 * até 100 e com duas casas — o `@DecimalMin`, o `@DecimalMax` e o `@Digits` do NUMERIC(5,2).
 */
const LIMITES_DA_PARTICIPACAO = numero({ maiorQue: 0, maximo: 100, casas: 2 });

/**
 * "100,00" com folga para a casa a mais que a regra precisa ver para recusar ("33,333"): cortar
 * no sexto caractere transformaria "100,001" em "100,00" sem ninguém perceber.
 */
export const TAMANHO_DO_PERCENTUAL = 8;

const CENTESIMOS_EM_CEM = 10000;

/**
 * O problema do percentual de um proprietário. A frase é curta porque cabe sob um campo estreito;
 * quem diz de quem é o campo é o rótulo dele, que o resumo do formulário repete.
 */
export function erroDaParticipacao(texto: string): string | undefined {
  return primeiraFalha(texto, obrigatorio('Informe o percentual.'), LIMITES_DA_PARTICIPACAO);
}

function emCentesimos(texto: string): number {
  return Math.round((lerNumero(texto) ?? 0) * 100);
}

/** Em centésimos, para "33,34 + 33,33 + 33,33" fechar em 100 sem resto de ponto flutuante. */
function somaEmCentesimos(textos: string[]): number {
  return textos.reduce((soma, texto) => soma + emCentesimos(texto), 0);
}

/** A soma do que já é número; o que ainda não é fica de fora — o campo dele é que acusa. */
export function somaDasParticipacoes(textos: string[]): number {
  return somaEmCentesimos(textos) / 100;
}

export interface SituacaoDaSoma {
  fecha: boolean;
  /** A frase da linha de soma: o que falta, o quanto passou, ou que fechou. */
  texto: string;
}

function algumPercentualInvalido(textos: string[]): boolean {
  return textos.some((texto) => erroDaParticipacao(texto) !== undefined);
}

/**
 * Por que a soma ainda não diz nada. Em tom de atenção, sem acusar o campo antes da tentativa:
 * quem marca o campo é o envio, e até lá a linha de soma não pode anunciar "fechado".
 */
function pendenciaDosPercentuais(textos: string[]): string {
  return textos.some((texto) => texto.trim() === '')
    ? 'Preencha o percentual de cada proprietário.'
    : 'Cada percentual vai de 0,01% a 100%, com até duas casas.';
}

/**
 * Onde a soma está em relação aos 100%. Diz a causa em vez de um número negativo ("faltam -235%")
 * ou "NaN": quem está acima ouve quanto passou, e quem está abaixo, quanto falta. Só fecha quando
 * todo percentual vale: uma linha vazia somando 0 não é contrato fechado.
 *
 * @param semNinguem a frase da lista vazia — cada tela diz o que fazer no lugar dela.
 */
export function situacaoDaSoma(textos: string[], semNinguem: string): SituacaoDaSoma {
  if (textos.length === 0) {
    return { fecha: false, texto: semNinguem };
  }
  if (algumPercentualInvalido(textos)) {
    return { fecha: false, texto: pendenciaDosPercentuais(textos) };
  }
  const diferenca = CENTESIMOS_EM_CEM - somaEmCentesimos(textos);
  if (diferenca > 0) {
    return {
      fecha: false,
      texto: `Faltam ${percentualEmTexto(diferenca / 100)} para fechar 100%.`,
    };
  }
  if (diferenca < 0) {
    return { fecha: false, texto: `Passou ${percentualEmTexto(-diferenca / 100)} de 100%.` };
  }
  return { fecha: true, texto: 'Fechado em 100%.' };
}

/**
 * O erro da lista de participações. Com um percentual inválido, quem fala é o campo dele: a soma
 * de um número que não vale não diz nada.
 */
export function erroDaSoma(textos: string[], semNinguem: string): string | undefined {
  if (algumPercentualInvalido(textos)) {
    return undefined;
  }
  const situacao = situacaoDaSoma(textos, semNinguem);
  return situacao.fecha ? undefined : situacao.texto;
}
