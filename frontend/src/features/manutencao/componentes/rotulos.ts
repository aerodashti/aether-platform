import type { SituacaoDoParametro, TipoDeParametro } from '../api/useManutencao';

export const ROTULO_DO_TIPO_DE_PARAMETRO: Record<TipoDeParametro, string> = {
  HORAS: 'Horas de célula',
  CICLOS: 'Ciclos',
  DATA: 'Data',
};

export const ROTULO_DA_SITUACAO: Record<SituacaoDoParametro, string> = {
  REGULAR: 'Em dia',
  ATENCAO: 'Próximo do limite',
  ESTOURADO: 'Limite estourado',
};

const NUMERO = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const MOEDA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const DATA = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
});

export function numeroEmTexto(valor: number | undefined): string {
  return valor === undefined ? '—' : NUMERO.format(valor);
}

export function moedaEmTexto(valor: number | undefined): string {
  return valor === undefined ? '—' : MOEDA.format(valor);
}

export function dataCurta(iso: string | undefined): string {
  return iso ? DATA.format(new Date(`${iso}T00:00:00`)) : '—';
}

/** "faltam 110 ciclos" / "estourou há 20 dias" — número com consequência, como manda o brief. */
export function restanteEmPalavras(
  restante: number | undefined,
  tipo: TipoDeParametro | undefined,
): string {
  if (restante === undefined || tipo === undefined) {
    return '—';
  }
  const unidade = tipo === 'HORAS' ? 'h' : tipo === 'CICLOS' ? 'ciclos' : 'dias';
  if (restante < 0) {
    return `estourou há ${NUMERO.format(Math.abs(restante))} ${unidade}`;
  }
  return `faltam ${NUMERO.format(restante)} ${unidade}`;
}
