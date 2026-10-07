import { describe, expect, it } from 'vitest';

import type { CustoResponse } from '../api/useCustos';

import { corpoDoCusto, rascunhoInicial, type RascunhoDoCusto } from './rascunhoDoCusto';

const EM_BRL = {
  id: 5,
  aeronaveId: 1,
  tipo: 'FIXO',
  categoria: 'SEGURO',
  data: '2026-09-01',
  descricao: 'Seguro mensal',
  proprietarioId: 7,
  moeda: 'BRL',
  // A API devolve `null` aqui, embora o tipo gerado diga só `undefined`.
  valorOriginal: null,
  cambio: null,
  valor: 14800.5,
} as unknown as CustoResponse;

const EM_USD: CustoResponse = {
  ...EM_BRL,
  moeda: 'USD',
  valorOriginal: 1200,
  cambio: 4.9223,
  valor: 5906.76,
};

describe('rascunhoInicial', () => {
  it('registrar começa vazio, em BRL, com a aeronave do filtro', () => {
    expect(rascunhoInicial(undefined, '3')).toMatchObject({
      aeronaveId: '3',
      categoria: '',
      moeda: 'BRL',
      valor: '',
      cambio: '',
    });
  });

  it('corrigir em BRL traz o valor com vírgula e o câmbio vazio, não "null"', () => {
    expect(rascunhoInicial(EM_BRL, '9')).toMatchObject({
      aeronaveId: '1',
      proprietarioId: '7',
      valor: '14800,5',
      cambio: '',
    });
  });

  it('corrigir em USD traz o valor original, não o BRL derivado', () => {
    expect(rascunhoInicial(EM_USD, undefined)).toMatchObject({ valor: '1200', cambio: '4,9223' });
  });
});

const RASCUNHO: RascunhoDoCusto = {
  aeronaveId: '1',
  categoria: 'ABASTECIMENTO',
  data: '2026-09-08',
  proprietarioId: '',
  relatorioDeVoo: '',
  moeda: 'BRL',
  valor: '1.850',
  cambio: '4,9',
  descricao: 'Jet A-1',
  notaFiscal: '',
};

describe('corpoDoCusto', () => {
  it('lê o número brasileiro, deixa de fora o vazio e não leva câmbio em BRL', () => {
    expect(corpoDoCusto(RASCUNHO)).toEqual({
      aeronaveId: 1,
      categoria: 'ABASTECIMENTO',
      data: '2026-09-08',
      descricao: 'Jet A-1',
      relatorioDeVoo: undefined,
      proprietarioId: undefined,
      notaFiscal: undefined,
      moeda: 'BRL',
      valor: 1850,
      cambio: undefined,
    });
  });

  it('em USD leva o câmbio, e a atribuição como número', () => {
    expect(corpoDoCusto({ ...RASCUNHO, moeda: 'USD', proprietarioId: '7' })).toMatchObject({
      valor: 1850,
      cambio: 4.9,
      proprietarioId: 7,
    });
  });

  it('não monta corpo com valor ilegível: NaN viraria null no JSON', () => {
    expect(corpoDoCusto({ ...RASCUNHO, valor: '15.725,00,0' })).toBeUndefined();
  });
});
