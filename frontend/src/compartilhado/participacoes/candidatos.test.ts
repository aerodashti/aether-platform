import { describe, expect, it } from 'vitest';

import type { ProprietarioResponse } from '@/compartilhado/proprietarios/useProprietarios';

import { candidatosAoContrato } from './candidatos';

const cadastrados: ProprietarioResponse[] = [
  { id: 1, nome: 'Ricardo Almeida', situacao: 'ATIVO' },
  { id: 2, nome: 'Vetor Participações', situacao: 'ATIVO' },
  { id: 3, nome: 'Helena Sarraf', situacao: 'INATIVO' },
  { id: 4, nome: 'Marina Costa', situacao: 'ATIVO' },
];

describe('candidatosAoContrato', () => {
  it('só os ativos que não estão de fora, com id e nome', () => {
    expect(candidatosAoContrato(cadastrados, [2])).toEqual([
      { id: 1, nome: 'Ricardo Almeida' },
      { id: 4, nome: 'Marina Costa' },
    ]);
  });

  it('ninguém sobra quando todos os ativos estão de fora', () => {
    expect(candidatosAoContrato(cadastrados, [1, 2, 4])).toEqual([]);
  });
});
