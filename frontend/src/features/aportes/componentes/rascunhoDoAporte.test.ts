import { describe, expect, it } from 'vitest';

import { competenciaPadrao, corpoDoAporte, rascunhoInicial } from './rascunhoDoAporte';

describe('rascunho do aporte', () => {
  it('a competência padrão é o mês anterior ao do crédito, atravessando o ano', () => {
    expect(competenciaPadrao('2026-10-07')).toBe('2026-09');
    expect(competenciaPadrao('2026-01-03')).toBe('2025-12');
    expect(competenciaPadrao('')).toBe('');
  });

  it('para registrar, nasce com o crédito de hoje, a competência anterior e a aeronave do filtro', () => {
    expect(rascunhoInicial(undefined, '1', '2026-10-07')).toEqual({
      aeronaveId: '1',
      proprietarioId: '',
      data: '2026-10-07',
      competencia: '2026-09',
      valor: '',
    });
  });

  it('para corrigir, nasce com o aporte gravado', () => {
    const aporte = {
      id: 5,
      aeronaveId: 1,
      proprietarioId: 7,
      data: '2026-10-03',
      competencia: '2026-09',
      valor: 25000.5,
    };

    expect(rascunhoInicial(aporte, '2', '2026-10-07')).toEqual({
      aeronaveId: '1',
      proprietarioId: '7',
      data: '2026-10-03',
      competencia: '2026-09',
      valor: '25000,5',
    });
  });

  it('o corpo lê "25.000" como vinte e cinco mil, e nunca manda NaN', () => {
    const rascunho = rascunhoInicial(undefined, '1', '2026-10-07');

    expect(corpoDoAporte({ ...rascunho, proprietarioId: '7', valor: '25.000' })).toEqual({
      aeronaveId: 1,
      proprietarioId: 7,
      data: '2026-10-07',
      competencia: '2026-09',
      valor: 25000,
    });
    expect(corpoDoAporte({ ...rascunho, proprietarioId: '7', valor: 'abc' })).toBeUndefined();
    expect(corpoDoAporte({ ...rascunho, valor: '10' })).toBeUndefined();
  });
});
