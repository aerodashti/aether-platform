import { describe, expect, it } from 'vitest';

import { competenciaEmTexto, taxaEmTexto } from './rotulos';

describe('rótulos de aportes', () => {
  it('escreve a competência como a grade do protótipo', () => {
    expect(competenciaEmTexto('2026-09')).toBe('Set/26');
  });

  it('escreve a taxa com o símbolo, e o extrato vazio como traço', () => {
    expect(taxaEmTexto(0.91)).toBe('0,91%');
    expect(taxaEmTexto(null)).toBe('—');
  });
});
