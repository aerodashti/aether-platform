import { describe, expect, it } from 'vitest';

import type { ProprietarioResponse } from '@/compartilhado/proprietarios/useProprietarios';

import type { CustoResponse } from '../api/useCustos';

import { apoioDaAtribuicao, apoioDoRelatorioDeVoo } from './apoiosDoCusto';
import {
  escolhaValida,
  opcoesDeAeronave,
  opcoesDeAtribuicao,
  situacaoDasListas,
} from './opcoesDoCusto';

const PROPRIETARIOS: ProprietarioResponse[] = [
  { id: 7, nome: 'Ricardo Meirelles', situacao: 'ATIVO' },
  { id: 8, nome: 'Helena Sarraf', situacao: 'ATIVO' },
  { id: 9, nome: 'Otávio Lins', situacao: 'INATIVO' },
];
const VINCULOS = [
  { aeronaveId: 1, proprietarioId: 7, matricula: 'PS-MEP', percentual: 60 },
  { aeronaveId: 1, proprietarioId: 9, matricula: 'PS-MEP', percentual: 40 },
  { aeronaveId: 2, proprietarioId: 8, matricula: 'PR-KRT', percentual: 100 },
];

function rotulos(opcoes: Array<{ rotulo: string }>) {
  return opcoes.map((opcao) => opcao.rotulo);
}

describe('opcoesDeAtribuicao', () => {
  it('no registro, só os donos ativos da aeronave, depois do rateio', () => {
    const opcoes = opcoesDeAtribuicao({
      proprietarios: PROPRIETARIOS,
      vinculos: VINCULOS,
      aeronaveId: '1',
      custo: undefined,
    });

    expect(rotulos(opcoes)).toEqual(['Rateio entre os proprietários', 'Ricardo Meirelles']);
  });

  it('na correção, quem já paga segue escolhível, marcado como inativo', () => {
    const custo = { aeronaveId: 1, proprietarioId: 9 } as CustoResponse;

    const opcoes = opcoesDeAtribuicao({
      proprietarios: PROPRIETARIOS,
      vinculos: VINCULOS,
      aeronaveId: '1',
      custo,
    });

    expect(opcoes).toContainEqual({ valor: '9', rotulo: 'Otávio Lins (inativo)' });
  });

  it('sem a lista, a atribuição gravada aparece pelo nome que veio no lançamento', () => {
    const custo = { aeronaveId: 1, proprietarioId: 9, nomeDoProprietario: 'Otávio Lins' };

    const opcoes = opcoesDeAtribuicao({
      proprietarios: undefined,
      vinculos: undefined,
      aeronaveId: '1',
      custo: custo as CustoResponse,
    });

    expect(opcoes).toContainEqual({ valor: '9', rotulo: 'Otávio Lins' });
  });
});

describe('opcoesDeAeronave e escolhaValida', () => {
  const frota = [{ id: 1, matricula: 'PS-MEP', modelo: 'Citation XLS+' }];

  it('a aeronave que veio crua da URL e não existe vira vazio', () => {
    const opcoes = opcoesDeAeronave(frota, undefined);

    expect(escolhaValida(opcoes, '1')).toBe('1');
    expect(escolhaValida(opcoes, '999')).toBe('');
    expect(escolhaValida(opcoes, 'abc')).toBe('');
  });

  it('na correção, a aeronave do lançamento existe mesmo sem a frota carregada', () => {
    const custo = { aeronaveId: 3, matricula: 'PP-JHF' } as CustoResponse;

    expect(opcoesDeAeronave(undefined, custo)).toContainEqual({ valor: '3', rotulo: 'PP-JHF' });
  });
});

describe('situacaoDasListas', () => {
  it('falha se uma falhou, carrega se uma carrega, senão está pronta', () => {
    const pronta = { isPending: false, isError: false };

    expect(situacaoDasListas(pronta, { isPending: false, isError: true })).toBe('falhou');
    expect(situacaoDasListas(pronta, { isPending: true, isError: false })).toBe('carregando');
    expect(situacaoDasListas(pronta, pronta)).toBe('pronta');
  });
});

describe('apoioDaAtribuicao', () => {
  const base = { donos: 'pronta' as const, matricula: 'PR-KRT', vinculos: VINCULOS };

  it('explica por que só há o rateio', () => {
    expect(apoioDaAtribuicao({ ...base, aeronaveId: '' })).toBe(
      'Escolha a aeronave para ver os proprietários dela.',
    );
    expect(apoioDaAtribuicao({ ...base, aeronaveId: '4', matricula: 'PS-FUM' })).toBe(
      'PS-FUM não tem contrato vigente: o custo não será rateado até haver proprietários.',
    );
    expect(apoioDaAtribuicao({ ...base, donos: 'falhou', aeronaveId: '1' })).toBe(
      'Não foi possível carregar os proprietários.',
    );
  });

  it('com contrato, diz que a lista é a de hoje e o atribuído vai inteiro', () => {
    expect(apoioDaAtribuicao({ ...base, aeronaveId: '2' })).toMatch(/donos de hoje/);
  });
});

describe('apoioDoRelatorioDeVoo', () => {
  it('diz que só o custo variável segue as horas do voo', () => {
    expect(apoioDoRelatorioDeVoo('VARIAVEL')).toMatch(/segue as horas deste voo/);
    expect(apoioDoRelatorioDeVoo('FIXO')).toMatch(/Só para consulta/);
  });
});
