import { describe, expect, it } from 'vitest';

import { prazoEmPalavras, resumoDaFrota } from './rotulos';

describe('prazoEmPalavras', () => {
  it('trata passado e futuro como o mesmo eixo, sem mostrar sinal', () => {
    expect(prazoEmPalavras(12)).toBe('em 12 dias');
    expect(prazoEmPalavras(-3)).toBe('há 3 dias');
  });

  it('as bordas viram palavra, não número', () => {
    expect(prazoEmPalavras(0)).toBe('vence hoje');
    expect(prazoEmPalavras(1)).toBe('vence amanhã');
    expect(prazoEmPalavras(-1)).toBe('venceu ontem');
  });
});

describe('resumoDaFrota', () => {
  it('concorda em número', () => {
    expect(resumoDaFrota(1, 0).frota).toBe('1 aeronave');
    expect(resumoDaFrota(4, 0).frota).toBe('4 aeronaves');
    expect(resumoDaFrota(4, 1).impedimento).toBe('1 impedida de voar');
    expect(resumoDaFrota(4, 2).impedimento).toBe('2 impedidas de voar');
  });

  it('não mostra zero impedidas — é ruído, não informação', () => {
    expect(resumoDaFrota(4, 0).impedimento).toBeNull();
  });
});
