import type {
  ManutencaoResponse,
  SituacaoDoParametro,
  TipoDeParametro,
} from '../api/useManutencao';

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

/** A unidade em que cada régua conta o limite, o restante e a faixa de aviso. */
export const UNIDADE_DA_REGUA: Record<TipoDeParametro, string> = {
  HORAS: 'h',
  CICLOS: 'ciclos',
  DATA: 'dias',
};

const NUMERO = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const MOEDA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
// Ano com quatro dígitos: com dois, um 0026 digitado por engano apareceria igual a 2026.
const DATA = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export function numeroEmTexto(valor: number | null | undefined): string {
  return valor == null ? '—' : NUMERO.format(valor);
}

export function moedaEmTexto(valor: number | null | undefined): string {
  return valor == null ? '—' : MOEDA.format(valor);
}

/** "07/10/2026". */
export function dataCompleta(iso: string | null | undefined): string {
  return iso ? DATA.format(new Date(`${iso}T00:00:00`)) : '—';
}

/** "Inspeção de 100 h — célula, de 22/09/2026": o que distingue uma manutenção das outras. */
export function nomeDaManutencao(manutencao: ManutencaoResponse): string {
  return `${manutencao.descricao ?? 'Manutenção'}, de ${dataCompleta(manutencao.data)}`;
}

/** "faltam 110 ciclos" / "estourou há 20 dias" — número com consequência, como manda o brief. */
export function restanteEmPalavras(
  restante: number | undefined,
  tipo: TipoDeParametro | undefined,
): string {
  if (restante === undefined || tipo === undefined) {
    return '—';
  }
  const unidade = UNIDADE_DA_REGUA[tipo];
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
    return dataCompleta(parametro.dataLimite);
  }
  if (parametro.limite == null || parametro.tipo === undefined) {
    return '—';
  }
  return `${NUMERO.format(parametro.limite)} ${UNIDADE_DA_REGUA[parametro.tipo]}`;
}

/** "hoje 3.412,5 h" — a referência atual, na mesma unidade. */
export function atualEmTexto(parametro: { tipo?: TipoDeParametro; atual?: number | null }): string {
  if (parametro.atual == null || parametro.tipo === undefined || parametro.tipo === 'DATA') {
    return '';
  }
  return `hoje ${NUMERO.format(parametro.atual)} ${UNIDADE_DA_REGUA[parametro.tipo]}`;
}

/** "avisa 100 h antes" / "avisa 30 dias antes". */
export function janelaDeAvisoEmTexto(parametro: {
  tipo?: TipoDeParametro;
  aviso?: number | null;
}): string {
  if (parametro.aviso == null || parametro.tipo === undefined) {
    return '—';
  }
  return `${NUMERO.format(parametro.aviso)} ${UNIDADE_DA_REGUA[parametro.tipo]} antes`;
}

/** A hora sem os segundos: "14:30". */
export function horaCurta(hora: string | undefined): string {
  return hora ? hora.slice(0, 5) : '';
}
