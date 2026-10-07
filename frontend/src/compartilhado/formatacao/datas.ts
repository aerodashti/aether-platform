/**
 * Datas como o campo nativo as entrega e espera: texto "AAAA-MM-DD" (e "AAAA-MM" na competência),
 * sempre no fuso de quem usa. `toISOString` é UTC e, depois das 21h em Brasília, já estaria no dia
 * seguinte — por isso nada aqui passa por ele.
 */

function doisDigitos(numero: number): string {
  return String(numero).padStart(2, '0');
}

function emTexto(data: Date): string {
  return `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}`;
}

/** Hoje, no fuso de quem usa. */
export function hojeLocal(): string {
  return emTexto(new Date());
}

/** A competência corrente, "AAAA-MM", no fuso de quem usa. */
export function competenciaLocal(): string {
  return hojeLocal().slice(0, 7);
}

function deTexto(iso: string): Date {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return new Date(ano ?? 0, (mes ?? 1) - 1, dia ?? 1);
}

/** A data `dias` à frente (ou atrás, se negativo). */
export function somarDias(iso: string, dias: number): string {
  const data = deTexto(iso);
  data.setDate(data.getDate() + dias);
  return emTexto(data);
}

/**
 * A data `meses` à frente (ou atrás). O dia que não existe no mês de destino cai no último dia
 * dele: 31/01 + 1 mês é 28/02 (ou 29/02), e não 03/03.
 */
export function somarMeses(iso: string, meses: number): string {
  const data = deTexto(iso);
  const dia = data.getDate();
  data.setDate(1);
  data.setMonth(data.getMonth() + meses);
  const ultimoDia = new Date(data.getFullYear(), data.getMonth() + 1, 0).getDate();
  data.setDate(Math.min(dia, ultimoDia));
  return emTexto(data);
}

/** A competência `meses` à frente (ou atrás): "2026-10" − 1 é "2026-09". */
export function somarMesesNaCompetencia(competencia: string, meses: number): string {
  return somarMeses(`${competencia}-01`, meses).slice(0, 7);
}
