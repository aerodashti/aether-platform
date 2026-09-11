/** Formatação do diário. Enum → texto fica no front: é redação de tela. */

const NUMERO = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const INTEIRO = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const DATA = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
});

export function horasEmTexto(valor: number | undefined): string {
  return valor === undefined ? '—' : `${NUMERO.format(valor)} h`;
}

export function kmEmTexto(valor: number | undefined): string {
  return valor === undefined ? '—' : INTEIRO.format(valor);
}

export function dataCurta(iso: string | undefined): string {
  return iso ? DATA.format(new Date(`${iso}T00:00:00`)) : '—';
}

/** "HH:MM–HH:MM" quando o par existe; travessão quando não. */
export function janela(partida: string | undefined, pouso: string | undefined): string {
  if (!partida || !pouso) {
    return '—';
  }
  return `${partida.slice(0, 5)}–${pouso.slice(0, 5)}`;
}

/** A competência corrente no formato do input month: "2026-09". */
export function competenciaAtual(): string {
  return new Date().toISOString().slice(0, 7);
}

export const ATRIBUICAO_DE_MANUTENCAO = 'Manutenção · divide entre todos';
