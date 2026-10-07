import { describe, expect, it } from 'vitest';

import type { TripulanteResponse } from '../api/useTripulantes';

import { rascunhoDe, requestDe } from './rascunhoDoTripulante';

/** Como a API manda: ausente vem `null`, não `undefined`. */
const SERGIO = {
  id: 3,
  nome: 'Sérgio Tanaka',
  canac: null,
  funcao: 'INSTRUTOR',
  validadeCma: null,
  validadeCht: null,
  horasTotais: null,
  telefone: null,
  email: null,
  situacao: 'INATIVO',
} as unknown as TripulanteResponse;

describe('rascunhoDe', () => {
  it('o que veio nulo abre em branco, e não com o texto "null"', () => {
    const rascunho = rascunhoDe(SERGIO);

    expect(rascunho.horasTotais).toBe('');
    expect(rascunho.canac).toBe('');
    expect(rascunho.validadeCma).toBe('');
    expect(rascunho.situacao).toBe('INATIVO');
  });

  it('as horas abrem com vírgula, como se digitam', () => {
    expect(rascunhoDe({ ...SERGIO, horasTotais: 3115.5 }).horasTotais).toBe('3115,5');
  });
});

describe('requestDe', () => {
  it('lê as horas no formato brasileiro: o ponto é milhar', () => {
    expect(requestDe({ ...rascunhoDe(), horasTotais: '3.115,5' }).horasTotais).toBe(3115.5);
    expect(requestDe({ ...rascunhoDe(), horasTotais: '8.420' }).horasTotais).toBe(8420);
  });

  it('o que está em branco vai ausente, e o nome vai sem espaços nas pontas', () => {
    const corpo = requestDe({ ...rascunhoDe(), nome: '  Juliana Prates ', telefone: '  ' });

    expect(corpo).toEqual({
      nome: 'Juliana Prates',
      funcao: 'COMANDANTE',
      situacao: 'ATIVO',
    });
  });
});
