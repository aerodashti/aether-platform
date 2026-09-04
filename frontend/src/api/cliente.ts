import { logger } from '@/compartilhado/log/logger';

/** Cabeçalho de correlação: o mesmo valor aparece no log do backend. */
const HEADER_REQUISICAO = 'X-Request-Id';

/** O Vite faz proxy de /api para o backend, então não há CORS nem variável de ambiente. */
const BASE = '/api';

export class ErroDeApi extends Error {
  readonly status: number;
  readonly requisicao: string | null;

  constructor(mensagem: string, status: number, requisicao: string | null) {
    super(mensagem);
    this.name = 'ErroDeApi';
    this.status = status;
    this.requisicao = requisicao;
  }
}

/** Formato RFC 9457 devolvido pelo TratadorGlobalDeErros do backend. */
interface ProblemDetail {
  title?: string;
  detail?: string;
}

async function lerDetalhe(resposta: Response): Promise<string> {
  try {
    const problema = (await resposta.json()) as ProblemDetail;
    return problema.detail ?? problema.title ?? resposta.statusText;
  } catch {
    return resposta.statusText;
  }
}

/**
 * Faz uma requisição GET e devolve o corpo já tipado.
 *
 * O tipo vem de `tipos-gerados.ts`, gerado do OpenAPI do backend: não há validação de resposta em
 * runtime, por decisão registrada em `docs/adr/0005-tipos-do-openapi.md`.
 */
export async function buscar<T>(caminho: string): Promise<T> {
  const resposta = await fetch(`${BASE}${caminho}`, {
    headers: { Accept: 'application/json' },
  });
  const requisicao = resposta.headers.get(HEADER_REQUISICAO);

  if (!resposta.ok) {
    const detalhe = await lerDetalhe(resposta);
    logger.erro('Falha na requisição à API', {
      caminho,
      status: resposta.status,
      requisicao,
    });
    throw new ErroDeApi(detalhe, resposta.status, requisicao);
  }

  return (await resposta.json()) as T;
}
