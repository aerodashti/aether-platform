import { describe, expect, it } from 'vitest';

import { ehCompetencia } from '@/compartilhado/formulario/regras';

import { competenciaEntre, janelaDeCompetencias, mesesEntre } from './competencia';

describe('competência do recorte', () => {
  it('reconhece só AAAA-MM com mês de 01 a 12', () => {
    expect(ehCompetencia('2026-10')).toBe(true);
    expect(ehCompetencia('2026-13')).toBe(false);
    expect(ehCompetencia('2026-1')).toBe(false);
    expect(ehCompetencia('setembro')).toBe(false);
  });

  it('a janela vai de 2000-01 a doze meses à frente, atravessando o ano', () => {
    expect(janelaDeCompetencias('2026-10')).toEqual({ primeira: '2000-01', ultima: '2027-10' });
  });

  it('a regra deixa o vazio passar e diz o formato e a janela', () => {
    const regra = competenciaEntre(janelaDeCompetencias('2026-10'));

    expect(regra('')).toBeUndefined();
    expect(regra('2027-10')).toBeUndefined();
    expect(regra('2026-1')).toBe('Use o formato AAAA-MM, como 2026-10.');
    expect(regra('1999-12')).toBe('Use uma competência de 01/2000 até 10/2027.');
    expect(competenciaEntre()('9999-12')).toBeUndefined();
  });

  it('conta os meses entre duas competências', () => {
    expect(mesesEntre('2026-01', '2026-12')).toBe(11);
    expect(mesesEntre('2016-10', '2026-10')).toBe(120);
  });
});
