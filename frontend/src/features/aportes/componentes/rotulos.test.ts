import { describe, expect, it } from 'vitest';

import { competenciaEmTexto, lerValor } from './rotulos';

describe('rótulos de aportes', () => {
  it('lê o valor do jeito que se digita no Brasil', () => {
    expect(lerValor('25.000,00')).toBe(25000);
    expect(lerValor('25000,5')).toBe(25000.5);
    expect(lerValor('25000.50')).toBe(25000.5);
    expect(lerValor('R$ 1.250,75')).toBe(1250.75);
  });

  it('escreve a competência como a grade do protótipo', () => {
    expect(competenciaEmTexto('2026-09')).toBe('Set/26');
  });
});
