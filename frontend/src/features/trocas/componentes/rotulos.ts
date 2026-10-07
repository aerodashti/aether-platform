import type { TrocaResponse } from '../api/useTrocas';

const MOEDA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const HORAS = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const KM = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const DATA = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
});
const DATA_COMPLETA = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export function moedaEmTexto(valor: number | null | undefined): string {
  return valor == null ? '—' : MOEDA.format(valor);
}

export function horasEmTexto(valor: number | null | undefined): string {
  return valor == null ? '—' : `${HORAS.format(valor)} h`;
}

export function kmEmTexto(valor: number | null | undefined): string {
  return valor == null ? '—' : KM.format(valor);
}

export function dataCurta(iso: string | undefined): string {
  return iso ? DATA.format(new Date(`${iso}T00:00:00`)) : '—';
}

/** "2026-10-03" → "03/10/2026": o ano inteiro, para a mensagem que cita um limite. */
export function dataCompleta(iso: string): string {
  return DATA_COMPLETA.format(new Date(`${iso}T00:00:00`));
}

/** "2,5 h de Ricardo Meirelles para Vetor Participações na PS-MEP, em 20/09/26": a troca por extenso. */
export function descricaoDaTroca(troca: TrocaResponse): string {
  return `${horasEmTexto(troca.horas)} de ${troca.nomeDoCedente ?? ''} para ${
    troca.nomeDoRecebedor ?? ''
  } na ${troca.matricula ?? ''}, em ${dataCurta(troca.data)}`;
}

/** A frase do saldo de horas, do ponto de vista do proprietário escolhido. */
export function fraseDoSaldo(nome: string, horasADevolver: number): string {
  if (horasADevolver === 0) {
    return `${nome} está quite nas trocas pendentes.`;
  }
  return horasADevolver > 0
    ? `${nome} tem ${horasEmTexto(horasADevolver)} a devolver.`
    : `${nome} tem ${horasEmTexto(-horasADevolver)} a receber de volta.`;
}
