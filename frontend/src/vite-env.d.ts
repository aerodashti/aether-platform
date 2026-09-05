/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Endpoint OTLP HTTP do coletor. Sem ele, a observabilidade do frontend é no-op. */
  readonly VITE_OTEL_ENDPOINT?: string;
  /** Cabeçalhos do exporter, no formato `chave=valor,chave2=valor2`. Opcional. */
  readonly VITE_OTEL_HEADERS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
