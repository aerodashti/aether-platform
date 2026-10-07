import { describe, expect, it } from 'vitest';

import { confirmacaoDoAporte, confirmacaoDoRendimento } from './confirmacoes';

const APORTE = {
  id: 5,
  aeronaveId: 1,
  matricula: 'PS-MEP',
  nomeDoProprietario: 'Ricardo Meirelles',
  competencia: '2026-09',
  valor: 25000,
};

describe('confirmações', () => {
  it('o aporte salvo no recorte diz valor, quem, onde e a competência', () => {
    expect(
      confirmacaoDoAporte(APORTE, { aeronaveId: '1', de: '2026-09', ate: '2026-09' }, false),
    ).toMatch(
      /^Aporte de R\$\s25\.000,00 de Ricardo Meirelles registrado na PS-MEP, competência Set\/26\.$/,
    );
  });

  it('fora do recorte, avisa por que não aparece na grade', () => {
    const outroMes = { aeronaveId: '', de: '2026-10', ate: '2026-10' };
    const outraAeronave = { aeronaveId: '2', de: '', ate: '' };

    expect(confirmacaoDoAporte(APORTE, outroMes, true)).toContain(
      'corrigido na PS-MEP, competência Set/26. Ele não aparece na grade porque está fora do recorte selecionado.',
    );
    expect(confirmacaoDoAporte(APORTE, outraAeronave, false)).toContain('fora do recorte');
  });

  it('o rendimento também confirma, e no período sem limites está sempre no recorte', () => {
    const rendimento = {
      aeronaveId: 1,
      matricula: 'PS-MEP',
      competencia: '2026-09',
      valor: 948.22,
    };

    expect(confirmacaoDoRendimento(rendimento, { aeronaveId: '', de: '', ate: '' }, false)).toMatch(
      /^Rendimento de R\$\s948,22 registrado na PS-MEP, competência Set\/26\.$/,
    );
  });
});
