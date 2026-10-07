import { describe, expect, it } from 'vitest';

import { donosDaAeronave, opcoesDoProprietario, situacaoDosDonos } from './donosDoAporte';

const VINCULOS = [
  { proprietarioId: 7, aeronaveId: 1, matricula: 'PS-MEP', percentual: 60 },
  { proprietarioId: 8, aeronaveId: 2, matricula: 'PR-KRT', percentual: 100 },
];
const PROPRIETARIOS = [
  { id: 7, nome: 'Ricardo Meirelles' },
  { id: 8, nome: 'Helena Sarraf' },
  { id: 9, nome: 'Vetor Participações' },
];

describe('donos do aporte', () => {
  it('são os do contrato vigente da aeronave escolhida', () => {
    expect(donosDaAeronave(VINCULOS, PROPRIETARIOS, '1', undefined)).toEqual([
      { valor: '7', rotulo: 'Ricardo Meirelles' },
    ]);
  });

  it('corrigindo o aporte de quem saiu do contrato, ele continua escolhível', () => {
    const aporte = { id: 5, aeronaveId: 1, proprietarioId: 9, nomeDoProprietario: 'Vetor' };

    expect(donosDaAeronave(VINCULOS, PROPRIETARIOS, '1', aporte)).toEqual([
      { valor: '7', rotulo: 'Ricardo Meirelles' },
      { valor: '9', rotulo: 'Vetor' },
    ]);
  });

  it('distingue carregando, falha e sem contrato', () => {
    expect(situacaoDosDonos({ carregando: true, falhou: false, quantidade: 0 })).toBe('carregando');
    expect(situacaoDosDonos({ carregando: false, falhou: true, quantidade: 0 })).toBe('falhou');
    expect(situacaoDosDonos({ carregando: false, falhou: false, quantidade: 0 })).toBe(
      'semContrato',
    );
    expect(situacaoDosDonos({ carregando: false, falhou: false, quantidade: 1 })).toBe('pronta');
  });

  it('a primeira opção diz por que a lista está vazia, e dono sem nome não aparece', () => {
    expect(opcoesDoProprietario('', 'pronta', [])).toEqual([
      { valor: '', rotulo: 'Escolha a aeronave primeiro' },
    ]);
    expect(opcoesDoProprietario('4', 'semContrato', [])).toEqual([
      { valor: '', rotulo: 'Nenhum proprietário no contrato' },
    ]);
    expect(opcoesDoProprietario('1', 'carregando', [{ valor: '7', rotulo: '' }])).toEqual([
      { valor: '', rotulo: 'Carregando os proprietários…' },
    ]);
  });
});
