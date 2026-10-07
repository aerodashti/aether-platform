import { describe, expect, it } from 'vitest';

import { horaLocal, instanteDe, pousoNoDiaSeguinte } from './horarios';

describe('horários do trecho', () => {
  it('monta o instante a partir da data e da hora locais, e volta à mesma hora local', () => {
    const partida = instanteDe('2026-09-08', '08:30');

    expect(partida).toBe(new Date(2026, 8, 8, 8, 30).toISOString());
    expect(horaLocal(partida)).toBe('08:30');
  });

  it('pouso antes da partida é no dia seguinte, não 23 horas depois no mesmo dia', () => {
    const pouso = instanteDe('2026-09-08', '01:00', '23:30');

    expect(pousoNoDiaSeguinte('23:30', '01:00')).toBe(true);
    expect(pouso).toBe(new Date(2026, 8, 9, 1, 0).toISOString());
  });

  it('sem data ou sem hora não há instante', () => {
    expect(instanteDe('', '08:30')).toBeUndefined();
    expect(instanteDe('2026-09-08', '')).toBeUndefined();
    expect(horaLocal(undefined)).toBe('');
  });
});
