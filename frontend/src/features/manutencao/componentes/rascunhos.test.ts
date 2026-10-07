import { describe, expect, it } from 'vitest';

import type { ManutencaoResponse, ParametroResponse } from '../api/useManutencao';

import { corpoDaManutencao, rascunhoInicial as rascunhoDaManutencao } from './rascunhoDaManutencao';
import {
  corpoDoParametro,
  rascunhoInicial as rascunhoDoParametro,
  trocarRegua,
} from './rascunhoDoParametro';

// O formato real da API: o opcional ausente vem `null`, não omitido.
const SEM_VALOR = {
  id: 2,
  aeronaveId: 1,
  data: '2026-11-20',
  hora: null,
  responsavel: null,
  descricao: 'Boletim de serviço — trem de pouso',
  valor: null,
  status: 'PROGRAMADA',
  concluidaEm: null,
} as unknown as ManutencaoResponse;

const PESAGEM = {
  id: 3,
  aeronaveId: 1,
  nome: 'Pesagem regulamentar',
  tipo: 'DATA',
  limite: null,
  dataLimite: '2027-05-09',
  aviso: 30,
} as unknown as ParametroResponse;

describe('rascunho da manutenção', () => {
  it('o opcional nulo vira campo vazio, nunca o texto "null"', () => {
    expect(rascunhoDaManutencao(SEM_VALOR)).toEqual({
      data: '2026-11-20',
      hora: '',
      responsavel: '',
      descricao: 'Boletim de serviço — trem de pouso',
      valor: '',
    });
    expect(rascunhoDaManutencao({ ...SEM_VALOR, hora: '09:00:00', valor: 1500.5 }).valor).toBe(
      '1500,5',
    );
  });

  it('o corpo lê o valor brasileiro e não manda vazio nem NaN', () => {
    const rascunho = { ...rascunhoDaManutencao(SEM_VALOR), valor: '1.500,00', responsavel: ' ' };
    expect(corpoDaManutencao(rascunho, 1)).toEqual({
      aeronaveId: 1,
      data: '2026-11-20',
      hora: undefined,
      responsavel: undefined,
      descricao: 'Boletim de serviço — trem de pouso',
      valor: 1500,
    });
    expect(corpoDaManutencao({ ...rascunho, valor: '48.000' }, 1)?.valor).toBe(48000);
    expect(corpoDaManutencao({ ...rascunho, valor: 'null500' }, 1)).toBeUndefined();
  });
});

describe('rascunho do parâmetro', () => {
  it('o limite nulo de um parâmetro de data vira campo vazio', () => {
    expect(rascunhoDoParametro(PESAGEM)).toMatchObject({ tipo: 'DATA', limite: '', aviso: '30' });
  });

  it('trocar a régua apaga limite e aviso, em vez de mudar a unidade em silêncio', () => {
    const pesagem = rascunhoDoParametro(PESAGEM);
    expect(trocarRegua(pesagem, 'HORAS')).toEqual({
      ...pesagem,
      tipo: 'HORAS',
      limite: '',
      dataLimite: '',
      aviso: '',
    });
    expect(trocarRegua(pesagem, 'DATA')).toBe(pesagem);
  });

  it('o corpo lê "4.000" como quatro mil e só manda a data na régua de data', () => {
    const horas = { ...rascunhoDoParametro(), nome: ' Célula ', limite: '4.000', aviso: '100' };
    expect(corpoDoParametro(horas, 5)).toEqual({
      aeronaveId: 5,
      nome: 'Célula',
      tipo: 'HORAS',
      limite: 4000,
      dataLimite: undefined,
      aviso: 100,
    });
    expect(corpoDoParametro(rascunhoDoParametro(PESAGEM), 5)).toMatchObject({
      limite: undefined,
      dataLimite: '2027-05-09',
      aviso: 30,
    });
    expect(corpoDoParametro({ ...horas, aviso: 'abc' }, 5)).toBeUndefined();
  });
});
