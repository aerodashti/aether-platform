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

export function numeroEmTexto(valor: number | null | undefined): string {
  return valor == null ? '—' : NUMERO.format(valor);
}

export function moedaEmTexto(valor: number | null | undefined): string {
  return valor == null ? '—' : MOEDA.format(valor);
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

/** "3.000 ciclos" / "1.200 h" / a data — o limite na unidade do tipo. */
export function limiteEmTexto(parametro: {
  tipo?: TipoDeParametro;
  limite?: number | null;
  dataLimite?: string | null;
}): string {
  if (parametro.tipo === 'DATA') {
    return dataCurta(parametro.dataLimite ?? undefined);
  }
  if (parametro.limite == null) {
    return '—';
  }
  return parametro.tipo === 'HORAS'
    ? `${NUMERO.format(parametro.limite)} h`
    : `${NUMERO.format(parametro.limite)} ciclos`;
}

/** "hoje: 3.412,5 h" — a referência atual, na mesma unidade. */
export function atualEmTexto(parametro: { tipo?: TipoDeParametro; atual?: number | null }): string {
  if (parametro.atual == null || parametro.tipo === 'DATA') {
    return '';
  }
  return parametro.tipo === 'HORAS'
    ? `hoje ${NUMERO.format(parametro.atual)} h`
    : `hoje ${NUMERO.format(parametro.atual)} ciclos`;
}

/** "avisa 100 h antes" / "avisa 30 dias antes". */
export function janelaDeAvisoEmTexto(parametro: {
  tipo?: TipoDeParametro;
  aviso?: number | null;
}): string {
  if (parametro.aviso == null || parametro.tipo === undefined) {
    return '—';
  }
  const unidade =
    parametro.tipo === 'HORAS' ? 'h' : parametro.tipo === 'CICLOS' ? 'ciclos' : 'dias';
  return `${NUMERO.format(parametro.aviso)} ${unidade} antes`;
}

/** A hora sem os segundos: "14:30". */
export function horaCurta(hora: string | undefined): string {
  return hora ? hora.slice(0, 5) : '';
}
