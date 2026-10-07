const MOEDA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const PERCENTUAL = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});
const DATA = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
});
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function moedaEmTexto(valor: number | null | undefined): string {
  return valor == null ? '—' : MOEDA.format(valor);
}

export function taxaEmTexto(taxa: number | null | undefined): string {
  return taxa == null ? '—' : `${PERCENTUAL.format(taxa)}%`;
}

export function dataCurta(iso: string | undefined): string {
  return iso ? DATA.format(new Date(`${iso}T00:00:00`)) : '—';
}

/** "2026-09" → "Set/26", como o protótipo escreve a competência na grade. */
export function competenciaEmTexto(competencia: string | undefined): string {
  if (!competencia) {
    return '—';
  }
  const [ano = '', mes = ''] = competencia.split('-');
  return `${MESES[Number(mes) - 1]}/${ano.slice(2)}`;
}
