import { describe, expect, it } from 'vitest';

import { RecorteInvalido } from './leituraDaFalha';
import { falhaDoRecorte, periodoForaDeOrdem } from './recorteDeCompetencias';

describe('periodoForaDeOrdem', () => {
  it('recusa no De a inicial depois da final; ponta vazia é sem limite', () => {
    expect(periodoForaDeOrdem('2026-10', '2026-01')).toEqual({
      de: 'A competência inicial vem depois da final.',
    });
    expect(periodoForaDeOrdem('2026-01', '2026-10')).toBeUndefined();
    expect(periodoForaDeOrdem('2026-10', '2026-10')).toBeUndefined();
    expect(periodoForaDeOrdem('', '2026-01')).toBeUndefined();
  });
});

describe('falhaDoRecorte', () => {
  it('mostra o primeiro erro, da competência ao Até; sem erro, não há falha', () => {
    const falha = falhaDoRecorte({ de: 'Use o formato AAAA-MM, como 2026-10.', ate: 'outro' });
    expect(falha).toBeInstanceOf(RecorteInvalido);
    expect(falha?.message).toBe('Use o formato AAAA-MM, como 2026-10.');
    expect(falhaDoRecorte({ competencia: undefined })).toBeNull();
  });
});
