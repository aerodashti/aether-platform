import { describe, expect, it } from 'vitest';

import { semanasDaCompetencia, somarMeses, tituloDaCompetencia } from './rotulos';

describe('semanasDaCompetencia', () => {
  it('cobre setembro de 2026 de segunda a domingo, com as sobras marcadas', () => {
    const semanas = semanasDaCompetencia('2026-09');

    // 1º de setembro de 2026 é uma terça: a primeira semana recua até 31/08.
    expect(semanas[0]?.[0]?.iso).toBe('2026-08-31');
    expect(semanas[0]?.[0]?.doMes).toBe(false);
    expect(semanas[0]?.[1]?.iso).toBe('2026-09-01');
    expect(semanas[0]?.[1]?.doMes).toBe(true);

    // A última semana termina no domingo 04/10.
    const ultima = semanas.at(-1);
    expect(ultima?.at(-1)?.iso).toBe('2026-10-04');
    expect(semanas.every((semana) => semana.length === 7)).toBe(true);
  });

  it('fevereiro que começa na segunda sai com exatamente quatro semanas', () => {
    // Fevereiro de 2027 começa numa segunda e tem 28 dias: 4 semanas cravadas.
    const semanas = semanasDaCompetencia('2027-02');
    expect(semanas).toHaveLength(4);
    expect(semanas[0]?.[0]?.iso).toBe('2027-02-01');
    expect(semanas.at(-1)?.at(-1)?.iso).toBe('2027-02-28');
  });
});

describe('somarMeses', () => {
  it('atravessa a virada do ano nos dois sentidos', () => {
    expect(somarMeses('2026-12', 1)).toBe('2027-01');
    expect(somarMeses('2026-01', -1)).toBe('2025-12');
  });
});

describe('tituloDaCompetencia', () => {
  it('escreve o mês por extenso, capitalizado', () => {
    expect(tituloDaCompetencia('2026-09')).toMatch(/^Setembro de 2026$/i);
  });
});
