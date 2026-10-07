import { describe, expect, it } from 'vitest';

import {
  corpoDoRendimento,
  rascunhoInicial,
  rendimentoPeloExtrato,
  semPercentual,
  type RascunhoDoRendimento,
} from './rascunhoDoRendimento';

const PREENCHIDO: RascunhoDoRendimento = {
  aeronaveId: '1',
  data: '2026-09-28',
  aplicacao: 'CDB DI',
  saldoAplicado: '104.200,00',
  taxa: '0,91%',
  valor: '948,22',
};

describe('rascunho do rendimento', () => {
  it('tira o símbolo de percentual do fim da taxa', () => {
    expect(semPercentual('0,91%')).toBe('0,91');
    expect(semPercentual('0,91 % ')).toBe('0,91 ');
    expect(semPercentual('0,91')).toBe('0,91');
  });

  it('para corrigir, o extrato vazio que a API devolve como null vira campo vazio', () => {
    const gravado = {
      id: 9,
      aeronaveId: 1,
      data: '2026-09-28',
      aplicacao: 'CDB DI',
      saldoAplicado: null,
      taxa: 0.91,
      valor: 948.22,
    } as unknown as Parameters<typeof rascunhoInicial>[0];

    expect(rascunhoInicial(gravado, undefined, '2026-10-07')).toMatchObject({
      aeronaveId: '1',
      saldoAplicado: '',
      taxa: '0,91',
      valor: '948,22',
    });
  });

  it('o corpo lê o milhar com ponto e a taxa com o símbolo', () => {
    expect(corpoDoRendimento(PREENCHIDO)).toEqual({
      aeronaveId: 1,
      data: '2026-09-28',
      aplicacao: 'CDB DI',
      saldoAplicado: 104200,
      taxa: 0.91,
      valor: 948.22,
    });
  });

  it('extrato vazio não vai; ilegível não vira null calado, e o envio não acontece', () => {
    expect(corpoDoRendimento({ ...PREENCHIDO, saldoAplicado: '', taxa: '' })).toMatchObject({
      saldoAplicado: undefined,
      taxa: undefined,
    });
    expect(corpoDoRendimento({ ...PREENCHIDO, taxa: 'abc' })).toBeUndefined();
    expect(corpoDoRendimento({ ...PREENCHIDO, saldoAplicado: '1,2,3' })).toBeUndefined();
  });

  it('saldo × taxa dá o rendimento esperado pelo extrato, em centavos', () => {
    expect(rendimentoPeloExtrato(PREENCHIDO)).toBe(948.22);
    expect(rendimentoPeloExtrato({ ...PREENCHIDO, taxa: '' })).toBeNull();
  });
});
