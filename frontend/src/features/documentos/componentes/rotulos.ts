const DATA = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});
const DECIMAL = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

/** Bytes como gente lê: "820 KB", "2,4 MB". */
export function tamanhoEmTexto(bytes: number | undefined): string {
  if (bytes == null) {
    return '—';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${DECIMAL.format(bytes / (1024 * 1024))} MB`;
}

export function dataEmTexto(instante: string | undefined): string {
  return instante ? DATA.format(new Date(instante)) : '—';
}

/** "1 documento", "3 documentos". */
export function quantidadeDeDocumentos(quantidade: number): string {
  return `${quantidade} ${quantidade === 1 ? 'documento' : 'documentos'}`;
}

/** As extensões que o servidor aceita, para a janela de arquivos oferecer primeiro. */
export const EXTENSOES_ACEITAS = '.pdf,.png,.jpg,.jpeg,.webp,.heic,.doc,.docx,.xls,.xlsx,.csv,.txt';
