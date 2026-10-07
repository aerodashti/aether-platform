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
        : (problema.detail ?? problema.title ?? mensagemDoStatus(resposta.status));
    return { mensagem, campos };
  } catch {
    return { mensagem: mensagemDoStatus(resposta.status), campos: {} };
  }
}

/**
 * Quando a resposta de erro não é Problem Details — um 502 do proxy, uma página do gateway —, o
 * `statusText` seria a única pista, em inglês no HTTP/1.1 e vazio no HTTP/2.
 */
function mensagemDoStatus(status: number): string {
  if (status === 401) {
    return 'Sua sessão terminou. Entre de novo para continuar.';
  }
  if (status === 403) {
    return 'Seu perfil não tem acesso a esta ação.';
  }
  if (status === 404) {
    return 'Não encontramos o que você procurava.';
  }
  if (status === 413) {
    return 'O envio é grande demais.';
  }
  if (status >= 500) {
    return 'O servidor não conseguiu responder agora. Tente de novo em instantes.';
  }
  return 'Não foi possível concluir a operação.';
}

/** O `status` de um {@link ErroDeApi} que nem chegou ao servidor. */
export const SEM_CONEXAO = 0;

/**
 * O `fetch` rejeita com `TypeError` quando não há rede ou o servidor está fora: sem esta tradução,
 * nenhuma tela mostra nada — todas esperam um {@link ErroDeApi}.
 */
async function requisitar(caminho: string, opcoes: RequestInit): Promise<Response> {
  try {
    return await fetch(`${BASE}${caminho}`, opcoes);
  } catch {
    contexto.registrar('http.caminho', caminho);
    contexto.erro('Falha de rede na requisição à API');
    throw new ErroDeApi(
      'Não foi possível falar com o servidor. Verifique a conexão e tente de novo.',
      SEM_CONEXAO,
      null,
    );
  }
}

/**
 * Faz uma requisição GET e devolve o corpo já tipado.
 *
 * O tipo vem de `tipos-gerados.ts`, gerado do OpenAPI do backend: não há validação de resposta em
 * runtime, por decisão registrada em `docs/adr/0005-tipos-do-openapi.md`.
 */
export async function buscar<T>(caminho: string): Promise<T> {
  const resposta = await requisitar(caminho, {
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
  const resposta = await requisitar(caminho, {
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
  const resposta = await requisitar(caminho, {
    method: 'POST',
    headers: { Accept: 'application/json', ...contexto.cabecalhosDeTrace() },
    credentials: 'same-origin',
    body: formulario,
  });
  return conferir<T>(caminho, resposta);
}

/**
 * Baixa um arquivo como `Blob`, para a tela salvá-lo. A falha vira {@link ErroDeApi}, como nas
 * outras chamadas: navegar até o endereço trocaria a tela pelo problem+json de um 404.
 */
export async function baixarArquivo(caminho: string): Promise<Blob> {
  const resposta = await requisitar(caminho, {
    headers: contexto.cabecalhosDeTrace(),
    credentials: 'same-origin',
  });
  await exigirSucesso(caminho, resposta);
  return resposta.blob();
}

/** Registra a correlação e, se a resposta é de erro, o traduz em {@link ErroDeApi}. */
async function exigirSucesso(caminho: string, resposta: Response): Promise<void> {
  const requisicao = resposta.headers.get(HEADER_REQUISICAO);

  contexto.registrar('http.caminho', caminho);
  contexto.registrar('http.status', resposta.status);
  contexto.registrar('requisicao', requisicao ?? 'sem-identificador');

  if (!resposta.ok) {
    const { mensagem, campos } = await lerProblema(resposta);
    contexto.erro('Falha na requisição à API');
    throw new ErroDeApi(mensagem, resposta.status, requisicao, campos);
  }
}

/**
 * Confere a resposta e devolve o corpo. O 204 do backend não tem corpo: tentar lê-lo como JSON
 * quebraria os passos da recuperação, que respondem exatamente isso.
 */
async function conferir<T>(caminho: string, resposta: Response): Promise<T> {
  await exigirSucesso(caminho, resposta);
  if (resposta.status === 204 || resposta.headers.get('Content-Length') === '0') {
    return undefined as T;
  }
  return (await resposta.json()) as T;
}
