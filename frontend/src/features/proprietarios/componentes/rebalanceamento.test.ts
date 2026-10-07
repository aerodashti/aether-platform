import { describe, expect, it } from 'vitest';

import { contratoFecha, contratosSemQuemSai, somaDasFatias } from './rebalanceamento';

const VINCULOS = [
  { proprietarioId: 1, aeronaveId: 10, matricula: 'PS-MEP', percentual: 50 },
  { proprietarioId: 2, aeronaveId: 10, matricula: 'PS-MEP', percentual: 30 },
  { proprietarioId: 3, aeronaveId: 10, matricula: 'PS-MEP', percentual: 20 },
  { proprietarioId: 1, aeronaveId: 11, matricula: 'PR-KRT', percentual: 100 },
];

describe('rebalanceamento da saída', () => {
  it('cada aeronave de quem sai começa com os demais na participação atual', () => {
    const [psMep] = contratosSemQuemSai(VINCULOS, 3);

    expect(psMep?.matricula).toBe('PS-MEP');
    expect(psMep?.liberado).toBe(20);
    expect(psMep?.fatias).toEqual([
      { proprietarioId: 1, percentual: '50' },
      { proprietarioId: 2, percentual: '30' },
    ]);
    expect(somaDasFatias(psMep?.fatias ?? [])).toBe(80);
  });

  it('o contrato novo só fecha em 100, com toda fatia acima de zero', () => {
    expect(
      contratoFecha([
        { proprietarioId: 1, percentual: '60' },
        { proprietarioId: 2, percentual: '40' },
      ]),
    ).toBe(true);
    expect(
      contratoFecha([
        { proprietarioId: 1, percentual: '50' },
        { proprietarioId: 2, percentual: '30' },
      ]),
    ).toBe(false);
    expect(
      contratoFecha([
        { proprietarioId: 1, percentual: '100' },
        { proprietarioId: 2, percentual: '0' },
      ]),
    ).toBe(false);
  });

  it('quem não está em contrato nenhum não tem o que redistribuir', () => {
    expect(contratosSemQuemSai(VINCULOS, 99)).toEqual([]);
  });
});
