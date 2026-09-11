/** A aritmética do mês, isolada para o teste não depender de renderização. */

export interface DiaDoCalendario {
  /** "AAAA-MM-DD", a chave que casa com as datas de trecho e manutenção. */
  iso: string;
  dia: number;
  doMes: boolean;
}

/** As semanas completas que cobrem a competência, começando na segunda-feira. */
export function semanasDaCompetencia(competencia: string): DiaDoCalendario[][] {
  const [ano, mes] = competencia.split('-').map(Number);
  if (!ano || !mes) {
    return [];
  }
  const primeiro = new Date(Date.UTC(ano, mes - 1, 1));
  // getUTCDay: 0 = domingo. A grade começa na segunda, como todo calendário de operação.
  const recuo = (primeiro.getUTCDay() + 6) % 7;
  const inicio = new Date(primeiro);
  inicio.setUTCDate(1 - recuo);

  const semanas: DiaDoCalendario[][] = [];
  const cursor = new Date(inicio);
  do {
    const semana: DiaDoCalendario[] = [];
    for (let i = 0; i < 7; i += 1) {
      semana.push({
        iso: cursor.toISOString().slice(0, 10),
        dia: cursor.getUTCDate(),
        doMes: cursor.getUTCMonth() === mes - 1,
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    semanas.push(semana);
  } while (cursor.getUTCMonth() === mes - 1);
  return semanas;
}

export const DIAS_DA_SEMANA = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];

// timeZone UTC porque os dias são construídos em UTC: sem isso, quem está a oeste de Greenwich
// veria o mês voltar um dia.
const MES_LONGO = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

export function tituloDaCompetencia(competencia: string): string {
  const [ano, mes] = competencia.split('-').map(Number);
  if (!ano || !mes) {
    return '';
  }
  const texto = MES_LONGO.format(new Date(Date.UTC(ano, mes - 1, 1)));
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Soma meses a uma competência "AAAA-MM" sem passar por fuso nenhum. */
export function somarMeses(competencia: string, delta: number): string {
  const [ano, mes] = competencia.split('-').map(Number);
  if (!ano || !mes) {
    return competencia;
  }
  const total = ano * 12 + (mes - 1) + delta;
  const novoAno = Math.floor(total / 12);
  const novoMes = (total % 12) + 1;
  return `${String(novoAno).padStart(4, '0')}-${String(novoMes).padStart(2, '0')}`;
}

export function competenciaAtual(): string {
  return new Date().toISOString().slice(0, 7);
}
