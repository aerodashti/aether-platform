import { describe, expect, it } from 'vitest';

import {
  erroDaParticipacao,
  erroDaSoma,
  situacaoDaSoma,
  somaDasParticipacoes,
} from './percentuais';

const SEM_NINGUEM = 'Adicione ao menos um proprietário ao contrato.';

describe('erroDaParticipacao', () => {
  it('vazio, ou só com espaços, pede o percentual', () => {
    expect(erroDaParticipacao('')).toBe('Informe o percentual.');
    expect(erroDaParticipacao('  ')).toBe('Informe o percentual.');
  });

  it('lê vírgula e ponto como decimal, do mesmo jeito nas duas telas', () => {
    expect(erroDaParticipacao('33,5')).toBeUndefined();
    expect(erroDaParticipacao('33.5')).toBeUndefined();
    expect(erroDaParticipacao('100')).toBeUndefined();
  });

  it('recusa os limites do servidor: zero, acima de 100, três casas e notação estranha', () => {
    expect(erroDaParticipacao('0')).toBe('Informe um valor maior que 0.');
    expect(erroDaParticipacao('-5')).toBe('Informe um valor maior que 0.');
    expect(erroDaParticipacao('100,01')).toBe('O máximo é 100.');
    expect(erroDaParticipacao('33,333')).toBe('Use no máximo 2 casas decimais.');
    expect(erroDaParticipacao('1e2')).toBe('Use só números, com vírgula para as casas decimais.');
    expect(erroDaParticipacao('0x64')).toBe('Use só números, com vírgula para as casas decimais.');
  });
});

describe('soma das participações', () => {
  it('fecha 33,34 + 33,33 + 33,33 sem resto de ponto flutuante', () => {
    expect(somaDasParticipacoes(['33,34', '33,33', '33,33'])).toBe(100);
    expect(situacaoDaSoma(['33,34', '33,33', '33,33'], SEM_NINGUEM)).toEqual({
      fecha: true,
      texto: 'Fechado em 100%.',
    });
  });

  it('diz quanto falta ou quanto passou, nunca um número negativo nem NaN', () => {
    expect(situacaoDaSoma(['50', '30'], SEM_NINGUEM).texto).toBe('Faltam 20% para fechar 100%.');
    expect(situacaoDaSoma(['50,5', '84,5'], SEM_NINGUEM).texto).toBe('Passou 35% de 100%.');
    expect(situacaoDaSoma(['abc', '100'], SEM_NINGUEM).texto).toBe('Fechado em 100%.');
  });

  it('lista vazia diz o que fazer no lugar de "faltam 100%"', () => {
    expect(situacaoDaSoma([], SEM_NINGUEM)).toEqual({ fecha: false, texto: SEM_NINGUEM });
    expect(erroDaSoma([], SEM_NINGUEM)).toBe(SEM_NINGUEM);
  });

  it('com um percentual inválido, a soma cala e deixa o campo falar', () => {
    expect(erroDaSoma(['100', ''], SEM_NINGUEM)).toBeUndefined();
    expect(erroDaSoma(['33,333', '66,667'], SEM_NINGUEM)).toBeUndefined();
    expect(erroDaSoma(['60', '30'], SEM_NINGUEM)).toBe('Faltam 10% para fechar 100%.');
    expect(erroDaSoma(['60', '40'], SEM_NINGUEM)).toBeUndefined();
  });
});
