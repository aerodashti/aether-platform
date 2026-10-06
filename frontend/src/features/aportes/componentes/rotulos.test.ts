import { describe, expect, it } from 'vitest';

import { competenciaEmTexto, deslocarCompetencia, lerValor } from './rotulos';

describe('rótulos de aportes', () => {
  it('lê o valor do jeito que se digita no Brasil', () => {
    expect(lerValor('25.000,00')).toBe(25000);
    expect(lerValor('25000,5')).toBe(25000.5);
    expect(lerValor('25000.50')).toBe(25000.5);
    expect(lerValor('R$ 1.250,75')).toBe(1250.75);
  });

  it('desloca a competência atravessando o ano', () => {
    expect(deslocarCompetencia('2026-01', -1)).toBe('2025-12');
    expect(deslocarCompetencia('2026-09', -11)).toBe('2025-10');
  });

  it('escreve a competência como a grade do protótipo', () => {
    expect(competenciaEmTexto('2026-09')).toBe('Set/26');
  });
});
