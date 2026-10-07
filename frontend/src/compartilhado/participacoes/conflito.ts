import { ErroDeApi } from '@/api/cliente';

const CONFLITO = 409;

/**
 * O servidor recusou porque os contratos mudaram desde que a tela os carregou: outro contrato
 * entrou em vigor, ou quem sai entrou ou saiu de uma aeronave. A tela recarrega e recomeça.
 */
export function ehConflito(erro: unknown): erro is ErroDeApi {
  return erro instanceof ErroDeApi && erro.status === CONFLITO;
}

/**
 * Num conflito, recarrega o que a tela mostra e só então recomeça o formulário, para ele nascer
 * dos dados novos. Fora de um conflito, não faz nada: o erro fica no resumo.
 */
export function recomecarNoConflito(
  erro: unknown,
  recarregar: () => Promise<unknown>,
  recomecar: () => void,
): void {
  if (ehConflito(erro)) {
    void recarregar().then(recomecar);
  }
}
