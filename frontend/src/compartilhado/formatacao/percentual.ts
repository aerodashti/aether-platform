const PERCENTUAL = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/**
 * "33,34%" — até duas casas, sem zeros à direita. Mora em `compartilhado` porque o contrato de
 * participação (aeronave) e o cartão de proprietário escrevem o mesmo número.
 */
export function percentualEmTexto(valor: number | undefined): string {
  return valor === undefined ? '—' : `${PERCENTUAL.format(valor)}%`;
}
