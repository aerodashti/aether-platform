import { describe, expect, it } from 'vitest';

import { validarAviso } from './validacaoDoAviso';

function erroDe(diasDeAviso: string) {
  return validarAviso({ diasDeAviso }).diasDeAviso;
}

describe('validarAviso', () => {
  it('aceita de 1 a 365 dias', () => {
    expect(erroDe('1')).toBeUndefined();
    expect(erroDe('45')).toBeUndefined();
    expect(erroDe('365')).toBeUndefined();
  });

  it('pede a antecedência quando o campo fica vazio', () => {
    expect(erroDe('')).toBe('Informe a antecedência, em dias.');
  });

  it('diz o limite que foi passado', () => {
    expect(erroDe('0')).toBe('O mínimo é 1.');
    expect(erroDe('999')).toBe('O máximo é 365.');
  });

  it('recusa notação científica, hexadecimal e fração em vez de convertê-las em silêncio', () => {
    expect(erroDe('1e2')).toBe('Use só números inteiros.');
    expect(erroDe('0x1')).toBe('Use só números inteiros.');
    expect(erroDe('30,5')).toBe('Use um número inteiro.');
  });
});
