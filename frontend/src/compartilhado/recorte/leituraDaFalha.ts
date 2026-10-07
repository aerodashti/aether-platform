import { ErroDeApi, SEM_CONEXAO } from '@/api/cliente';

/** O recorte que a própria tela já sabe inválido: a consulta nem sai, e a grade diz por quê. */
export class RecorteInvalido extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'RecorteInvalido';
  }
}

/**
 * O que pode resolver: repetir (o servidor ou a rede falharam), voltar ao recorte padrão (o pedido
 * foi recusado) ou nada que a tela ofereça (falta sessão ou permissão).
 */
export type AcaoDaFalha = 'tentar-de-novo' | 'limpar-filtros' | 'nenhuma';

export interface LeituraDaFalha {
  mensagem: string;
  acao: AcaoDaFalha;
}

/** Os 4xx que passam com o tempo. */
const PASSAM_COM_O_TEMPO = new Set([408, 429]);
/** Os 4xx de quem pede, não do recorte: limpar os filtros não dá sessão nem permissão. */
const DE_QUEM_PEDE = new Set([401, 403]);

function acaoPara(status: number): AcaoDaFalha | undefined {
  if (status === SEM_CONEXAO || PASSAM_COM_O_TEMPO.has(status)) {
    return 'tentar-de-novo';
  }
  if (DE_QUEM_PEDE.has(status)) {
    return 'nenhuma';
  }
  return status >= 400 && status < 500 ? 'limpar-filtros' : undefined;
}

/**
 * O que dizer quando uma consulta falha. A recusa do pedido ("A competência inicial vem depois da
 * final.", "Aeronave não encontrada.") é dita como o servidor a escreveu, porque repetir não
 * resolve; a falha do servidor ganha a frase da tela e o "Tentar de novo".
 */
export function lerFalhaDaConsulta(falha: unknown, generica: string): LeituraDaFalha {
  if (falha instanceof RecorteInvalido) {
    return { mensagem: falha.message, acao: 'limpar-filtros' };
  }
  const acao = falha instanceof ErroDeApi ? acaoPara(falha.status) : undefined;
  if (falha instanceof ErroDeApi && acao) {
    return { mensagem: falha.message, acao };
  }
  return { mensagem: generica, acao: 'tentar-de-novo' };
}
