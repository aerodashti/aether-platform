/**
 * O documento do proprietário: CPF (11 números) ou CNPJ (14 caracteres). Desde julho de 2026 a
 * Receita emite CNPJ alfanumérico (IN RFB 2.229/2024): os 12 primeiros caracteres podem ter
 * letras, e os dois verificadores continuam números.
 *
 * <p>É a mesma régua de `CpfCnpj.java`: a tela confere antes de enviar, e o servidor confere de novo.
 */

const PONTUACAO = /[.\-/\s]/g;
const FORMATO_DO_CPF = /^\d{11}$/;
const FORMATO_DO_CNPJ = /^[0-9A-Z]{12}\d{2}$/;
const PESOS_DO_CPF = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
const PESOS_DO_CNPJ = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

export const MENSAGEM_DE_DOCUMENTO_INVALIDO =
  'Confira o documento: o CPF tem 11 números; o CNPJ, 14 caracteres (letras só nos 12 primeiros). Os dígitos verificadores precisam bater.';

/** Sem pontuação nem espaço, e em maiúsculas: "12.abc.345/01de-35" é "12ABC34501DE35". */
export function normalizarCpfCnpj(texto: string): string {
  return texto.replace(PONTUACAO, '').toUpperCase();
}

/** "0" a "9" valem 0 a 9 e "A" vale 17: o código ASCII menos 48, como manda a Receita. */
function valor(caractere: string): number {
  return caractere.charCodeAt(0) - 48;
}

/** Módulo 11 sobre os caracteres antes da `posicao`, com os pesos alinhados à direita. */
function verificadorConfere(documento: string, posicao: number, pesos: number[]): boolean {
  const deslocamento = pesos.length - posicao;
  const soma = [...documento.slice(0, posicao)].reduce(
    (total, caractere, indice) => total + valor(caractere) * (pesos[deslocamento + indice] ?? 0),
    0,
  );
  const resto = soma % 11;
  const esperado = resto < 2 ? 0 : 11 - resto;
  return valor(documento.charAt(posicao)) === esperado;
}

/**
 * Os dois verificadores conferem, e a sequência repetida (que passa na conta, mas não é emitida)
 * é recusada. Recebe o documento já normalizado.
 */
export function cpfCnpjEhValido(documento: string): boolean {
  const formatoConhecido = FORMATO_DO_CPF.test(documento) || FORMATO_DO_CNPJ.test(documento);
  if (!formatoConhecido || new Set(documento).size === 1) {
    return false;
  }
  const pesos = documento.length === 11 ? PESOS_DO_CPF : PESOS_DO_CNPJ;
  return (
    verificadorConfere(documento, documento.length - 2, pesos) &&
    verificadorConfere(documento, documento.length - 1, pesos)
  );
}

interface Mascara {
  tamanhos: number[];
  separadores: string[];
}

const MASCARA_DO_CPF: Mascara = { tamanhos: [3, 3, 3, 2], separadores: ['.', '.', '-'] };
const MASCARA_DO_CNPJ: Mascara = { tamanhos: [2, 3, 3, 4, 2], separadores: ['.', '.', '/', '-'] };

function aplicar(documento: string, { tamanhos, separadores }: Mascara): string {
  let resto = documento;
  return tamanhos.reduce((formatado, tamanho, indice) => {
    if (resto === '') {
      return formatado;
    }
    const pedaco = resto.slice(0, tamanho);
    resto = resto.slice(tamanho);
    return formatado + (indice > 0 ? (separadores[indice - 1] ?? '') : '') + pedaco;
  }, '');
}

/**
 * A pontuação do documento enquanto se digita: até 11 números é CPF ("529.982.247-25"), daí em
 * diante — ou com letra — é CNPJ ("12.ABC.345/01DE-35"). O que não cabe em nenhum dos dois fica
 * como veio, para a validação dizer o que está errado em vez de a máscara cortar em silêncio.
 */
export function mascararCpfCnpj(texto: string): string {
  const documento = normalizarCpfCnpj(texto);
  if (!/^[0-9A-Z]{0,14}$/.test(documento)) {
    return texto;
  }
  const ehCpf = documento.length <= 11 && /^\d*$/.test(documento);
  return aplicar(documento, ehCpf ? MASCARA_DO_CPF : MASCARA_DO_CNPJ);
}

/**
 * O documento como o servidor o devolve (sem pontuação), pontuado para leitura. Comprimento
 * inesperado sai como veio — mascarar errado é pior que não mascarar.
 */
export function formatarCpfCnpj(cpfCnpj: string | null | undefined): string {
  if (!cpfCnpj) {
    return '—';
  }
  return cpfCnpj.length === 11 || cpfCnpj.length === 14 ? mascararCpfCnpj(cpfCnpj) : cpfCnpj;
}
