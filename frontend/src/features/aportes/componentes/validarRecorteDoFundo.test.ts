import { describe, expect, it } from 'vitest';

import { validarRecorteDoFundo } from './validarRecorteDoFundo';

const JANELA = { primeira: '2000-01', ultima: '2027-10' };

describe('validarRecorteDoFundo', () => {
  it('o mês confere formato e janela; vazio é todo o histórico', () => {
    const mensal = (competencia: string) =>
      validarRecorteDoFundo({ modo: 'MENSAL', competencia, de: '', ate: '' }, JANELA);

    expect(mensal('2026-10').competencia).toBeUndefined();
    expect(mensal('').competencia).toBeUndefined();
    expect(mensal('2026-13').competencia).toBe('Use o formato AAAA-MM, como 2026-10.');
    expect(mensal('2027-11').competencia).toBe('Use uma competência de 01/2000 até 10/2027.');
  });

  it('o período recusa a ponta fora da janela e o de depois do até', () => {
    const periodo = (de: string, ate: string) =>
      validarRecorteDoFundo({ modo: 'PERIODO', competencia: '', de, ate }, JANELA);

    expect(periodo('1999-12', '2026-10').de).toBe('Use uma competência de 01/2000 até 10/2027.');
    expect(periodo('2026-10', '2026-01')).toEqual({
      de: 'A competência inicial vem depois da final.',
    });
    expect(periodo('', '2026-01')).toEqual({ de: undefined, ate: undefined });
  });
});
