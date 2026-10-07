import { describe, expect, it } from 'vitest';

import { validarConclusao } from './validacaoDaConclusao';

const CONTEXTO = { hoje: '2026-10-07', dataProgramada: '2026-12-01' };

describe('validarConclusao', () => {
  it('aceita de um ano antes da programada até hoje', () => {
    expect(validarConclusao({ concluidaEm: '2025-12-01' }, CONTEXTO).concluidaEm).toBeUndefined();
    expect(validarConclusao({ concluidaEm: '2026-10-07' }, CONTEXTO).concluidaEm).toBeUndefined();
  });

  it('vazia, no futuro ou cedo demais, diz o problema', () => {
    expect(validarConclusao({ concluidaEm: '' }, CONTEXTO).concluidaEm).toBe(
      'Informe a data da conclusão.',
    );
    expect(validarConclusao({ concluidaEm: '2026-10-08' }, CONTEXTO).concluidaEm).toBe(
      'A conclusão já aconteceu: a data não pode ser futura.',
    );
    expect(validarConclusao({ concluidaEm: '2025-11-30' }, CONTEXTO).concluidaEm).toBe(
      'Use uma data a partir de 01/12/2025: a manutenção está programada para 01/12/2026.',
    );
  });

  it('nunca antes de 2000, nem com ano de cinco dígitos', () => {
    const antiga = { hoje: '2026-10-07', dataProgramada: '2000-06-01' };
    expect(validarConclusao({ concluidaEm: '1999-12-31' }, antiga).concluidaEm).toBe(
      'Use uma data a partir de 01/01/2000: a manutenção está programada para 01/06/2000.',
    );
    expect(validarConclusao({ concluidaEm: '20266-10-07' }, CONTEXTO).concluidaEm).toBe(
      'Use um ano de quatro dígitos.',
    );
  });
});
