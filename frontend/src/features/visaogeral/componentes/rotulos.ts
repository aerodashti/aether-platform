const MOEDA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const MOEDA_CURTA = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});
const UMA_CASA = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const INTEIRO = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

export function moeda(valor: number): string {
  return MOEDA.format(valor);
}

/** Sem centavos: o número grande do cartão e as barras do comparativo. */
export function moedaCurta(valor: number): string {
  return MOEDA_CURTA.format(valor);
}

export function horas(valor: number): string {
  return `${UMA_CASA.format(valor)} h`;
}

export function km(valor: number): string {
  return INTEIRO.format(valor);
}

/** "2,4 meses", "1 mês", "fundo descoberto" ou travessão, quando não há custo para medir. */
export function cobertura(meses: number | undefined, saldo: number): string {
  if (saldo < 0) {
    return 'fundo descoberto';
  }
  if (meses === undefined) {
    return '—';
  }
  return meses === 1 ? '1 mês' : `${UMA_CASA.format(meses)} meses`;
}
