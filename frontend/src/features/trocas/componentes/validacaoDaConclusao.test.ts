import { describe, expect, it } from 'vitest';

import { validarConclusao } from './validacaoDaConclusao';

const CONTEXTO = { hoje: '2026-10-07', dataDaTroca: '2026-09-20' };

describe('validarConclusao', () => {
  it('aceita da data da troca até hoje', () => {
    expect(validarConclusao({ concluidaEm: '2026-09-20' }, CONTEXTO).concluidaEm).toBeUndefined();
    expect(validarConclusao({ concluidaEm: '2026-10-07' }, CONTEXTO).concluidaEm).toBeUndefined();
  });

  it('vazia, antes da troca ou no futuro, diz o problema', () => {
    expect(validarConclusao({ concluidaEm: '' }, CONTEXTO).concluidaEm).toBe(
      'Informe a data da devolução.',
    );
    expect(validarConclusao({ concluidaEm: '2026-09-19' }, CONTEXTO).concluidaEm).toBe(
      'A devolução não pode ser antes da troca, de 20/09/2026.',
    );
    expect(validarConclusao({ concluidaEm: '2026-10-08' }, CONTEXTO).concluidaEm).toBe(
      'A devolução já aconteceu: a data não pode ser futura.',
    );
  });
});
