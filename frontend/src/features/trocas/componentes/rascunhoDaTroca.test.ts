import { describe, expect, it } from 'vitest';

import type { TrocaResponse } from '../api/useTrocas';

import { corpoDaTroca, rascunhoInicial, type RascunhoDaTroca } from './rascunhoDaTroca';

const RASCUNHO: RascunhoDaTroca = {
  aeronaveId: '1',
  data: '2026-09-20',
  cedenteId: '1',
  recebedorId: '2',
  horas: '2,5',
  km: '1.320',
  valorPorHora: '14.800',
  relatorioDeVoo: '  rv-2026-031 ',
  observacao: '   ',
};

describe('rascunhoInicial', () => {
  it('registrar começa vazio, com a data de hoje', () => {
    expect(rascunhoInicial(undefined, '2026-10-07')).toMatchObject({
      aeronaveId: '',
      data: '2026-10-07',
      horas: '',
    });
  });

  it('corrigir começa com a troca gravada, os números com vírgula', () => {
    const troca = {
      id: 5,
      aeronaveId: 1,
      data: '2026-09-20',
      cedenteId: 1,
      recebedorId: 2,
      horas: 2.5,
      km: 1320,
      valorPorHora: 14800.5,
      // A API devolve `null` no que não tem: o campo precisa nascer vazio, não "null".
      relatorioDeVoo: null,
    } as unknown as TrocaResponse;

    expect(rascunhoInicial(troca, '2026-10-07')).toMatchObject({
      aeronaveId: '1',
      horas: '2,5',
      km: '1320',
      valorPorHora: '14800,5',
      relatorioDeVoo: '',
    });
  });
});

describe('corpoDaTroca', () => {
  it('lê o número brasileiro: "14.800" é catorze mil e oitocentos, não 14,8', () => {
    expect(corpoDaTroca(RASCUNHO)).toEqual({
      aeronaveId: 1,
      data: '2026-09-20',
      cedenteId: 1,
      recebedorId: 2,
      horas: 2.5,
      km: 1320,
      valorPorHora: 14800,
      relatorioDeVoo: 'rv-2026-031',
      observacao: undefined,
    });
  });

  it('opcional vazio não vai; texto que não é número nunca vira NaN (nem null no JSON)', () => {
    expect(corpoDaTroca({ ...RASCUNHO, km: '', valorPorHora: '' })).toMatchObject({
      km: undefined,
      valorPorHora: undefined,
    });
    expect(corpoDaTroca({ ...RASCUNHO, km: '610 km' })).toBeUndefined();
    expect(corpoDaTroca({ ...RASCUNHO, valorPorHora: 'R$ 14.800/h' })).toBeUndefined();
    expect(corpoDaTroca({ ...RASCUNHO, horas: '2:30' })).toBeUndefined();
    expect(corpoDaTroca({ ...RASCUNHO, cedenteId: '' })).toBeUndefined();
  });
});
