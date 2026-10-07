import { describe, expect, it } from 'vitest';

import type { RascunhoDoParametro } from './rascunhoDoParametro';
import { validarParametro } from './validacaoDoParametro';

const HOJE = '2026-10-07';
const HORAS: RascunhoDoParametro = {
  nome: 'Inspeção de célula — 4.000 h',
  tipo: 'HORAS',
  limite: '4.000',
  dataLimite: '',
  aviso: '100',
};
const CICLOS: RascunhoDoParametro = { ...HORAS, tipo: 'CICLOS', limite: '3.000', aviso: '200' };
const DATA: RascunhoDoParametro = {
  ...HORAS,
  tipo: 'DATA',
  limite: '',
  dataLimite: '2027-05-09',
  aviso: '30',
};

function erros(base: RascunhoDoParametro, alteracao: Partial<RascunhoDoParametro> = {}) {
  return validarParametro({ ...base, ...alteracao }, HOJE);
}

describe('validarParametro', () => {
  it('as três réguas completas passam', () => {
    for (const rascunho of [HORAS, CICLOS, DATA]) {
      expect(Object.values(erros(rascunho)).filter(Boolean)).toEqual([]);
    }
  });

  it('a falta do limite fala a língua da régua', () => {
    expect(erros(HORAS, { limite: '' }).limite).toBe('Informe o limite em horas de célula.');
    expect(erros(CICLOS, { limite: ' ' }).limite).toBe('Informe o limite em ciclos.');
    expect(erros(DATA, { dataLimite: '' }).dataLimite).toBe('Informe a data limite.');
    expect(erros(DATA).limite).toBeUndefined();
    expect(erros(HORAS).dataLimite).toBeUndefined();
  });

  it('nome e faixa de aviso são obrigatórios', () => {
    expect(erros(HORAS, { nome: '' }).nome).toBe('Informe o nome do parâmetro.');
    expect(erros(HORAS, { aviso: '' }).aviso).toBe('Informe a faixa de aviso.');
  });

  it('"4.000" é quatro mil, e o limite cabe em NUMERIC(10,1)', () => {
    expect(erros(HORAS, { limite: '4.000,5' }).limite).toBeUndefined();
    expect(erros(HORAS, { limite: '0' }).limite).toBe('Informe um valor maior que 0.');
    // O singular ("1 casa decimal") é corrigido na regra comum, no branch base.
    expect(erros(HORAS, { limite: '0,01' }).limite).toMatch(/^Use no máximo 1 casas? decima/);
    expect(erros(HORAS, { limite: '1.000.000.000' }).limite).toBe('O máximo é 999.999.999,9.');
    expect(erros(HORAS, { aviso: 'abc' }).aviso).toBe(
      'Use só números, com vírgula para as casas decimais.',
    );
  });

  it('ciclos e dias são inteiros; só as horas têm décimos', () => {
    expect(erros(CICLOS, { limite: '3.000,5' }).limite).toBe('Use um número inteiro.');
    expect(erros(CICLOS, { aviso: '0,5' }).aviso).toBe('Use um número inteiro.');
    expect(erros(DATA, { aviso: '30,5' }).aviso).toBe('Use um número inteiro.');
    expect(erros(HORAS, { aviso: '0,5' }).aviso).toBeUndefined();
  });

  it('a faixa de aviso fica abaixo do limite em horas e ciclos', () => {
    expect(erros(HORAS, { limite: '100', aviso: '5.000' }).aviso).toBe(
      'A faixa de aviso precisa ser menor que o limite.',
    );
    expect(erros(CICLOS, { limite: '200', aviso: '200' }).aviso).toBe(
      'A faixa de aviso precisa ser menor que o limite.',
    );
    expect(erros(DATA, { aviso: '400' }).aviso).toBeUndefined();
  });

  it('a data limite fica entre 2000 e hoje + 10 anos; vencida dentro disso é aceita', () => {
    expect(erros(DATA, { dataLimite: '2026-08-21' }).dataLimite).toBeUndefined();
    expect(erros(DATA, { dataLimite: '0001-01-01' }).dataLimite).toBe(
      'Use uma data a partir de 01/01/2000.',
    );
    expect(erros(DATA, { dataLimite: '2036-10-08' }).dataLimite).toBe(
      'Use uma data até 07/10/2036.',
    );
    expect(erros(DATA, { dataLimite: '20266-10-07' }).dataLimite).toBe(
      'Use um ano de quatro dígitos.',
    );
  });
});
