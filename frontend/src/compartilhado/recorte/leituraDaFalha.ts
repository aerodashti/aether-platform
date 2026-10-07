import { ErroDeApi, SEM_CONEXAO } from '@/api/cliente';

/** O recorte que a própria tela já sabe inválido: a consulta nem sai, e a grade diz por quê. */
export class RecorteInvalido extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'RecorteInvalido';
  }
}

export interface LeituraDaFalha {
  mensagem: string;
  /** Se tentar de novo pode dar certo. Não pode quando o problema é o próprio pedido. */
  repetivel: boolean;
}

/** Os 4xx que passam com o tempo; os demais são do pedido, e repeti-lo dá no mesmo. */
const PASSAM_COM_O_TEMPO = new Set([408, 429]);

function ehRecusaDoPedido(status: number): boolean {
  return status >= 400 && status < 500 && !PASSAM_COM_O_TEMPO.has(status);
}

/**
 * O que dizer quando uma consulta falha. A recusa do pedido ("A competência inicial vem depois da
 * final.", "Aeronave não encontrada.") é dita como o servidor a escreveu, porque repetir não
 * resolve; a falha do servidor ou da rede ganha a frase da tela e o "Tentar de novo".
 */
export function lerFalhaDaConsulta(falha: unknown, generica: string): LeituraDaFalha {
  if (falha instanceof RecorteInvalido) {
    return { mensagem: falha.message, repetivel: false };
  }
  if (falha instanceof ErroDeApi && falha.status === SEM_CONEXAO) {
    return { mensagem: falha.message, repetivel: true };
  }
  if (falha instanceof ErroDeApi && ehRecusaDoPedido(falha.status)) {
    return { mensagem: falha.message, repetivel: false };
  }
  return { mensagem: generica, repetivel: true };
}
