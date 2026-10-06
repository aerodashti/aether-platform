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

/** A data de hoje no fuso de quem usa, "AAAA-MM-DD". `toISOString` é UTC e, depois das 21h em
 *  Brasília, já estaria no dia seguinte. */
export function hoje(): string {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

export function competenciaAtual(): string {
  return hoje().slice(0, 7);
}

/** A competência `meses` antes (negativo) ou depois de outra. */
export function deslocarCompetencia(competencia: string, meses: number): string {
  const [ano = 0, mes = 1] = competencia.split('-').map(Number);
  const data = new Date(Date.UTC(ano, mes - 1 + meses, 1));
  return data.toISOString().slice(0, 7);
}

/**
 * O valor como a pessoa o digita no Brasil: "25.000,00", "25000,5" ou "25000.50". Com vírgula,
 * o ponto é milhar; sem vírgula, o ponto é decimal.
 */
export function lerValor(texto: string): number {
  const limpo = texto.trim().replace(/\s|R\$/g, '');
  return Number(limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo);
}

/** O número para o campo: com vírgula, sem zeros à direita. */
export function valorParaCampo(valor: number | null | undefined): string {
  return valor == null ? '' : String(valor).replace('.', ',');
}
