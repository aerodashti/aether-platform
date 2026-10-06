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

/** Hoje no fuso de quem usa — toISOString é UTC. */
export function hoje(): string {
  const agora = new Date();
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(
    agora.getDate(),
  ).padStart(2, '0')}`;
}

/** Número digitado no formato brasileiro ("14.800,00", "2,5"); vazio é NaN. */
export function lerNumero(texto: string): number {
  const limpo = texto.trim().replace(/\s|R\$/g, '');
  if (limpo === '') {
    return Number.NaN;
  }
  return Number(limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo);
}

export function numeroParaCampo(valor: number | null | undefined): string {
  return valor == null ? '' : String(valor).replace('.', ',');
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
