/** Formatação do diário. Enum → texto fica no front: é redação de tela. */

/** Uma casa, como a coluna: o trecho lançado com 365,5 km não aparece como 366. */
const NUMERO = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const DATA = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
});

export function horasEmTexto(valor: number | undefined): string {
  return valor === undefined ? '—' : `${NUMERO.format(valor)} h`;
}

export function kmEmTexto(valor: number | undefined): string {
  return valor === undefined ? '—' : NUMERO.format(valor);
}

export function dataCurta(iso: string | undefined): string {
  return iso ? DATA.format(new Date(`${iso}T00:00:00`)) : '—';
}

export const ATRIBUICAO_DE_MANUTENCAO = 'Manutenção · divide entre todos';
