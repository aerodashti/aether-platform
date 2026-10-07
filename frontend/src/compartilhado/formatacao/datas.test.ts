import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  competenciaLocal,
  hojeLocal,
  somarDias,
  somarMeses,
  somarMesesNaCompetencia,
} from './datas';

describe('datas', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('hoje é o dia local, mesmo depois das 21h em Brasília', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 31, 23, 30));

    expect(hojeLocal()).toBe('2026-10-31');
    expect(competenciaLocal()).toBe('2026-10');
  });

  it('soma dias atravessando o mês e o ano', () => {
    expect(somarDias('2026-12-31', 1)).toBe('2027-01-01');
    expect(somarDias('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('soma meses sem pular para o mês seguinte no dia que não existe', () => {
    expect(somarMeses('2026-01-31', 1)).toBe('2026-02-28');
    expect(somarMeses('2026-10-07', 13)).toBe('2027-11-07');
    expect(somarMeses('2026-10-07', -120)).toBe('2016-10-07');
  });

  it('soma meses na competência', () => {
    expect(somarMesesNaCompetencia('2026-01', -1)).toBe('2025-12');
  });
});
