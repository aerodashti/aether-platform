import { context, propagation, trace, SpanStatusCode, type Attributes } from '@opentelemetry/api';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { BatchSpanProcessor, WebTracerProvider } from '@opentelemetry/sdk-trace-web';

/**
 * Fachada de observabilidade do frontend — o espelho do `ContextoDaRequisicao` do backend.
 *
 * O modelo é o mesmo: acumula-se o que explica o caminho de execução e, ao fim da interação,
 * sai **uma** linha com tudo. Os mesmos dados viram atributos de um span, que só é exportado
 * quando `VITE_OTEL_ENDPOINT` está definido; sem ele, o SDK não é registrado e tudo é no-op.
 */
export type Valor = string | number | boolean;

const NOME_DO_SERVICO = 'aether-frontend';
const endpoint: string | undefined = import.meta.env.VITE_OTEL_ENDPOINT;
/** Opcional, no formato `chave=valor,chave2=valor2`. Alguns coletores exigem autenticação. */
const cabecalhos: string | undefined = import.meta.env.VITE_OTEL_HEADERS;

let acumulado: Record<string, Valor> = {};

/**
 * Registrado na importação do módulo, e não no `main.tsx`, porque o SDK precisa estar de pé antes
 * do primeiro span — e o primeiro span nasce na primeira chamada de API.
 */
function lerCabecalhos(): Record<string, string> {
  if (!cabecalhos) {
    return {};
  }
  return Object.fromEntries(
    cabecalhos
      .split(',')
      .map((par) => par.split('='))
      .filter((par): par is [string, string] => par.length === 2)
      .map(([chave, valor]) => [chave.trim(), valor.trim()]),
  );
}

function registrarSdk(): void {
  if (!endpoint) {
    return;
  }
  new WebTracerProvider({
    resource: resourceFromAttributes({ 'service.name': NOME_DO_SERVICO }),
    spanProcessors: [
      new BatchSpanProcessor(
        new OTLPTraceExporter({ url: `${endpoint}/v1/traces`, headers: lerCabecalhos() }),
      ),
    ],
  }).register();
}

registrarSdk();

function encerrarInteracao(nome: string, anterior: Record<string, Valor>): void {
  const campos = { ...acumulado };
  const span = trace.getActiveSpan();
  span?.setAttributes(campos as Attributes);
  span?.end();
  if (import.meta.env.DEV) {
    console.info(`interacao ${nome}`, campos);
  }
  acumulado = anterior;
}

export const contexto = {
  /** Dado relevante do fluxo: identificadores, contagens, status. */
  registrar(chave: string, valor: Valor): void {
    acumulado[chave] = valor;
    trace.getActiveSpan()?.setAttribute(chave, valor);
  },

  /** Variável que determina um ramo. Registre **antes** do desvio, como no backend. */
  decisao(chave: string, valor: Valor): void {
    contexto.registrar(`decisao.${chave}`, valor);
  },

  /** Falha que a pessoa percebe. É a única coisa que aparece no console em produção. */
  erro(mensagem: string, dados: Record<string, Valor> = {}): void {
    Object.entries(dados).forEach(([chave, valor]) => {
      contexto.registrar(chave, valor);
    });
    const span = trace.getActiveSpan();
    span?.recordException(mensagem);
    span?.setStatus({ code: SpanStatusCode.ERROR, message: mensagem });

    console.error(mensagem, { ...acumulado });
  },

  /**
   * Delimita uma interação de usuário: abre um span, acumula o que acontecer dentro dela e emite
   * uma linha só ao terminar. Aceita função síncrona ou que devolva Promise.
   */
  interacao<T>(nome: string, executar: () => T): T {
    const anterior = acumulado;
    acumulado = {};
    return trace.getTracer(NOME_DO_SERVICO).startActiveSpan(nome, (): T => {
      let resultado: T;
      try {
        resultado = executar();
      } catch (falha) {
        encerrarInteracao(nome, anterior);
        throw falha;
      }
      if (resultado instanceof Promise) {
        return resultado.finally(() => {
          encerrarInteracao(nome, anterior);
        }) as T;
      }
      encerrarInteracao(nome, anterior);
      return resultado;
    });
  },

  /** Cabeçalhos `traceparent` para o backend entrar no mesmo trace. Vazio quando não há SDK. */
  cabecalhosDeTrace(): Record<string, string> {
    const portador: Record<string, string> = {};
    propagation.inject(context.active(), portador);
    return portador;
  },
};
