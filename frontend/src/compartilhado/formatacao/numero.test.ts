import { describe, expect, it } from 'vitest';

import { casasDecimais, lerNumero, numeroParaCampo } from './numero';

describe('lerNumero', () => {
  it.each([
    ['14.800,00', 14800],
    ['1.234.567,8', 1234567.8],
    ['2,5', 2.5],
    ['-12.500,00', -12500],
    ['25.000', 25000],
    ['4.9223', 4.9223],
    ['1.5', 1.5],
    ['R$ 1.850,00', 1850],
    ['3000', 3000],
  ])('lê "%s" como %d', (texto, esperado) => {
    expect(lerNumero(texto)).toBe(esperado);
  });

  it.each(['', '   ', 'abc', '1e3', '0x1A', '1,2,3', '1.23.4', '12,', ',5', 'NaN', 'Infinity'])(
    'recusa "%s" em vez de inventar um número',
    (texto) => {
      expect(lerNumero(texto)).toBeNull();
    },
  );
});

describe('casasDecimais', () => {
  it('conta as casas na leitura brasileira', () => {
    expect(casasDecimais('4,9223')).toBe(4);
    expect(casasDecimais('25.000')).toBe(0);
    expect(casasDecimais('1,50')).toBe(1);
  });
});

describe('numeroParaCampo', () => {
  it('devolve com vírgula, sem milhar, e vazio para ausente', () => {
    expect(numeroParaCampo(14800.5)).toBe('14800,5');
    expect(numeroParaCampo(null)).toBe('');
  });
});
