import { describe, expect, it } from 'vitest';

import { validarRecorteDoFechamento } from './validarRecorteDoFechamento';

const JANELA = { primeira: '2000-01', ultima: '2027-10' };

function periodo(de: string, ate: string) {
  return validarRecorteDoFechamento({ modo: 'PERIODO', competencia: '2026-10', de, ate }, JANELA);
}

describe('validarRecorteDoFechamento', () => {
  it('o mês é obrigatório e fica na janela do servidor', () => {
    const mensal = (competencia: string) =>
      validarRecorteDoFechamento({ modo: 'MENSAL', competencia, de: '', ate: '' }, JANELA);

    expect(mensal('2026-10')).toEqual({ competencia: undefined });
    expect(mensal('').competencia).toBe('Informe a competência.');
    expect(mensal('9999-12').competencia).toBe('Use uma competência de 01/2000 até 10/2027.');
  });

  it('o período tem as duas pontas, em ordem', () => {
    expect(periodo('', '2026-10').de).toBe('Informe a competência inicial.');
    expect(periodo('2026-12', '2026-10')).toEqual({
      de: 'A competência inicial vem depois da final.',
    });
    expect(periodo('2025-11', '2026-10')).toEqual({});
  });

  it('o período vai até dez anos, como no servidor', () => {
    expect(periodo('2016-11', '2026-10')).toEqual({});
    expect(periodo('2016-10', '2026-10')).toEqual({ ate: 'O período vai até dez anos.' });
  });
});
