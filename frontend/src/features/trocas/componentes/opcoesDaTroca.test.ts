import { describe, expect, it } from 'vitest';

import type { TrocaResponse } from '../api/useTrocas';

import {
  apoioDosProprietarios,
  escolhaValida,
  opcoesDeAeronave,
  proprietariosDaTroca,
  situacaoDasListas,
} from './opcoesDaTroca';

const PROPRIETARIOS = [
  { id: 1, nome: 'Ricardo Meirelles' },
  { id: 2, nome: 'Vetor Participações' },
  { id: 3, nome: 'Helena Sarraf' },
];
const VINCULOS = [
  { proprietarioId: 1, aeronaveId: 1, matricula: 'PS-MEP', percentual: 60 },
  { proprietarioId: 2, aeronaveId: 1, matricula: 'PS-MEP', percentual: 40 },
];
/** A troca de quem já saiu do contrato: Helena não está mais nos vínculos vigentes. */
const TROCA_DE_QUEM_SAIU = {
  id: 5,
  aeronaveId: 1,
  matricula: 'PS-MEP',
  modelo: 'Citation XLS+',
  cedenteId: 3,
  nomeDoCedente: 'Helena Sarraf',
  recebedorId: 2,
  nomeDoRecebedor: 'Vetor Participações',
} as TrocaResponse;

describe('opções da troca', () => {
  it('a situação das listas: uma falha basta; senão, uma pendente deixa carregando', () => {
    const pronta = { isPending: false, isError: false };
    expect(situacaoDasListas(pronta, pronta)).toBe('pronta');
    expect(situacaoDasListas(pronta, { isPending: true, isError: false })).toBe('carregando');
    expect(
      situacaoDasListas({ isPending: true, isError: false }, { isPending: false, isError: true }),
    ).toBe('falhou');
  });

  it('a escolha fora das opções vira vazio', () => {
    const opcoes = [{ valor: '1', rotulo: 'Ricardo' }];
    expect(escolhaValida(opcoes, '1')).toBe('1');
    expect(escolhaValida(opcoes, '2')).toBe('');
  });

  it('na correção, a aeronave da troca entra mesmo sem a frota carregada', () => {
    expect(opcoesDeAeronave(undefined, TROCA_DE_QUEM_SAIU)).toEqual([
      { valor: '1', rotulo: 'PS-MEP — Citation XLS+' },
    ]);
  });

  it('Cedeu e Recebeu: os donos do contrato vigente, com nome', () => {
    expect(
      proprietariosDaTroca({
        vinculos: VINCULOS,
        proprietarios: PROPRIETARIOS,
        aeronaveId: '1',
        troca: undefined,
      }),
    ).toEqual([
      { valor: '1', rotulo: 'Ricardo Meirelles' },
      { valor: '2', rotulo: 'Vetor Participações' },
    ]);
  });

  it('na correção, quem já saiu do contrato continua escolhível', () => {
    const opcoes = proprietariosDaTroca({
      vinculos: VINCULOS,
      proprietarios: PROPRIETARIOS,
      aeronaveId: '1',
      troca: TROCA_DE_QUEM_SAIU,
    });
    expect(opcoes.map((opcao) => opcao.rotulo)).toEqual([
      'Ricardo Meirelles',
      'Vetor Participações',
      'Helena Sarraf',
    ]);
  });

  it('o apoio de Cedeu diz por que não há o que escolher', () => {
    const base = { aeronaveId: '1', matricula: 'PP-JHF', situacao: 'pronta' as const };

    expect(apoioDosProprietarios({ ...base, aeronaveId: '', disponiveis: 0 })).toBe(
      'Escolha a aeronave para ver os proprietários do contrato.',
    );
    expect(apoioDosProprietarios({ ...base, situacao: 'carregando', disponiveis: 0 })).toBe(
      'Carregando os proprietários do contrato…',
    );
    expect(apoioDosProprietarios({ ...base, disponiveis: 1 })).toBe(
      'A PP-JHF não tem dois proprietários no contrato vigente: cadastre o contrato antes de registrar a troca.',
    );
    expect(apoioDosProprietarios({ ...base, disponiveis: 2 })).toBe(
      'Proprietários do contrato vigente da aeronave.',
    );
  });
});
