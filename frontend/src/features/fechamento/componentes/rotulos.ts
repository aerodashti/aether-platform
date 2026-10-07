const MOEDA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const HORAS = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const PERCENTUAL = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export function moedaEmTexto(valor: number | null | undefined): string {
  return valor == null ? '—' : MOEDA.format(valor);
}

export function horasEmTexto(valor: number | null | undefined): string {
  return valor == null ? '—' : `${HORAS.format(valor)} h`;
}

export function percentualEmTexto(valor: number | null | undefined): string {
  return valor == null ? '—' : `${PERCENTUAL.format(valor)}%`;
}

/** "2026-09" → "Setembro de 2026". */
export function competenciaPorExtenso(competencia: string | undefined): string {
  if (!competencia) {
    return '—';
  }
  const [ano = '', mes = ''] = competencia.split('-');
  return `${MESES[Number(mes) - 1] ?? ''} de ${ano}`;
}

/** "2026-09" → "Set/26", como a grade do período. */
export function competenciaCurta(competencia: string | undefined): string {
  if (!competencia) {
    return '—';
  }
  const [ano = '', mes = ''] = competencia.split('-');
  return `${(MESES[Number(mes) - 1] ?? '').slice(0, 3)}/${ano.slice(2)}`;
}

export const ROTULO_DA_BASE: Record<string, string> = {
  POR_USO: 'por uso (horas)',
  POR_PROPRIEDADE: 'por % de propriedade',
};

export const ROTULO_DO_MODELO_DE_APORTE: Record<string, string> = {
  FIXO: 'fixo mensal',
  PROPORCIONAL_AO_USO: 'proporcional ao uso',
};
