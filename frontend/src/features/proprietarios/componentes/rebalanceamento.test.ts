import { describe, expect, it } from 'vitest';

import {
  alterarPercentual,
  contratosSemQuemSai,
  incluirParticipacao,
  pedidoDeSaida,
  removerParticipacao,
} from './rebalanceamento';

const VINCULOS = [
  { proprietarioId: 1, aeronaveId: 10, contratoId: 100, matricula: 'PS-MEP', percentual: 50 },
  { proprietarioId: 2, aeronaveId: 10, contratoId: 100, matricula: 'PS-MEP', percentual: 33.33 },
  { proprietarioId: 3, aeronaveId: 10, contratoId: 100, matricula: 'PS-MEP', percentual: 16.67 },
  { proprietarioId: 1, aeronaveId: 11, contratoId: 110, matricula: 'PR-KRT', percentual: 100 },
];

/** O que a desestruturação devolveria se a aeronave não estivesse lá. */
const VAZIO = {
  aeronaveId: 0,
  contratoVigenteId: null,
  matricula: '',
  liberado: 0,
  participacoes: [],
};

describe('rebalanceamento da saída', () => {
  it('cada aeronave de quem sai começa com os demais na participação atual', () => {
    const [psMep] = contratosSemQuemSai(VINCULOS, 3);

    expect(psMep).toEqual({
      aeronaveId: 10,
      contratoVigenteId: 100,
      matricula: 'PS-MEP',
      liberado: 16.67,
      participacoes: [
        { proprietarioId: 1, percentual: '50', incluida: false },
        { proprietarioId: 2, percentual: '33,33', incluida: false },
      ],
    });
  });

  it('quem não está em contrato nenhum não tem o que redistribuir', () => {
    expect(contratosSemQuemSai(VINCULOS, 99)).toEqual([]);
  });

  it('quem entra pelo painel começa vazio e pode sair; os sócios atuais ficam', () => {
    const [prKrt] = contratosSemQuemSai(VINCULOS, 1).slice(1);
    const comHelena = incluirParticipacao(prKrt ?? VAZIO, 3);

    expect(comHelena.participacoes).toEqual([
      { proprietarioId: 3, percentual: '', incluida: true },
    ]);
    expect(removerParticipacao(comHelena, 3).participacoes).toEqual([]);
  });

  it('a saída vai na ordem da tela, com o vigente de que partiu e nunca NaN', () => {
    const [psMep] = contratosSemQuemSai(VINCULOS, 3);
    const editado = alterarPercentual(psMep ?? VAZIO, 2, '33.5');

    expect(pedidoDeSaida(3, [alterarPercentual(editado, 1, '')])).toEqual({
      proprietarioId: 3,
      contratos: [
        {
          aeronaveId: 10,
          contratoVigenteId: 100,
          participacoes: [
            { proprietarioId: 1, percentual: null },
            { proprietarioId: 2, percentual: 33.5 },
          ],
        },
      ],
    });
  });
});
