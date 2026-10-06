import { contexto } from '@/compartilhado/observabilidade/observabilidade';

/** Cabeçalho de correlação: o mesmo valor aparece no log do backend. */
const HEADER_REQUISICAO = 'X-Request-Id';

/** O Vite faz proxy de /api para o backend, então não há CORS nem variável de ambiente. */
const BASE = '/api';

export class ErroDeApi extends Error {
  readonly status: number;
  readonly requisicao: string | null;
  /** A mensagem de cada campo recusado pela validação, pelo nome do campo no JSON. */
  readonly campos: Record<string, string>;

  constructor(
    mensagem: string,
    status: number,
    requisicao: string | null,
    campos: Record<string, string> = {},
  ) {
    super(mensagem);
    this.name = 'ErroDeApi';
    this.status = status;
    this.requisicao = requisicao;
    this.campos = campos;
  }
}

/** Formato RFC 9457 devolvido pelo TratadorGlobalDeErros do backend. */
interface ProblemDetail {
  title?: string;
  detail?: string;
  campos?: Record<string, string>;
}

/**
 * O detalhe do erro e os campos recusados. Num 400 de validação o `detail` é sempre o genérico
 * "Verifique os campos informados", que não diz o quê: a mensagem passa a ser a dos campos.
 */
async function lerProblema(
  resposta: Response,
): Promise<{ mensagem: string; campos: Record<string, string> }> {
  try {
    const problema = (await resposta.json()) as ProblemDetail;
    const campos = problema.campos ?? {};
    const doCampo = Object.values(campos);
    const mensagem =
      doCampo.length > 0
        ? doCampo.join(' ')
        : (problema.detail ?? problema.title ?? resposta.statusText);
    return { mensagem, campos };
  } catch {
    return { mensagem: resposta.statusText, campos: {} };
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
    // O traceparent faz o span do backend nascer dentro do trace desta interação.
    headers: { Accept: 'application/json', ...contexto.cabecalhosDeTrace() },
    // O cookie de sessão é HttpOnly: quem o anexa é o navegador, não este código.
    credentials: 'same-origin',
  });
  return conferir<T>(caminho, resposta);
}

/**
 * Faz uma requisição com corpo JSON. `metodo` cobre POST, PUT e DELETE porque os três carregam a
 * mesma mecânica de erro e de correlação; o que muda é só o verbo e a presença de corpo.
 */
export async function enviar<T>(
  caminho: string,
  corpo?: unknown,
  metodo: 'POST' | 'PUT' | 'DELETE' = 'POST',
): Promise<T> {
  const resposta = await fetch(`${BASE}${caminho}`, {
    method: metodo,
    headers: {
      Accept: 'application/json',
      ...(corpo === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...contexto.cabecalhosDeTrace(),
    },
    credentials: 'same-origin',
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  return conferir<T>(caminho, resposta);
}

/**
 * Envia arquivos como `multipart/form-data`, cada um sob o mesmo `campo`. O Content-Type não é
 * definido aqui: o navegador o monta com o boundary, e defini-lo à mão quebraria o envio.
 */
export async function enviarArquivos<T>(
  caminho: string,
  campo: string,
  arquivos: File[],
): Promise<T> {
  const formulario = new FormData();
  for (const arquivo of arquivos) {
    formulario.append(campo, arquivo);
  }
  const resposta = await fetch(`${BASE}${caminho}`, {
    method: 'POST',
    headers: { Accept: 'application/json', ...contexto.cabecalhosDeTrace() },
    credentials: 'same-origin',
    body: formulario,
  });
  return conferir<T>(caminho, resposta);
}

/** O endereço de um recurso para o navegador abrir ou baixar, com o mesmo prefixo das chamadas. */
export function enderecoDaApi(caminho: string): string {
  return `${BASE}${caminho}`;
}

/**
 * Registra a correlação, traduz o erro e devolve o corpo. O 204 do backend não tem corpo: tentar
 * lê-lo como JSON quebraria os passos da recuperação, que respondem exatamente isso.
 */
async function conferir<T>(caminho: string, resposta: Response): Promise<T> {
  const requisicao = resposta.headers.get(HEADER_REQUISICAO);

  contexto.registrar('http.caminho', caminho);
  contexto.registrar('http.status', resposta.status);
  contexto.registrar('requisicao', requisicao ?? 'sem-identificador');

  if (!resposta.ok) {
    const { mensagem, campos } = await lerProblema(resposta);
    contexto.erro('Falha na requisição à API');
    throw new ErroDeApi(mensagem, resposta.status, requisicao, campos);
  }

  if (resposta.status === 204 || resposta.headers.get('Content-Length') === '0') {
    return undefined as T;
  }
  return (await resposta.json()) as T;
}
