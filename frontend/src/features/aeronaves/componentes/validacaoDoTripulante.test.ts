import { describe, expect, it } from 'vitest';

import { rascunhoDe, type RascunhoDoTripulante } from './rascunhoDoTripulante';
import { validarTripulante } from './validacaoDoTripulante';

const HOJE = '2026-10-07';

function com(campos: Partial<RascunhoDoTripulante>): RascunhoDoTripulante {
  return { ...rascunhoDe(), nome: 'Juliana Prates', ...campos };
}

function erros(campos: Partial<RascunhoDoTripulante>) {
  return validarTripulante(com(campos), HOJE);
}

describe('validarTripulante', () => {
  it('o vínculo novo em branco só pede o nome', () => {
    const resultado = validarTripulante(rascunhoDe(), HOJE);

    expect(Object.entries(resultado).filter(([, erro]) => erro)).toEqual([
      ['nome', 'Informe o nome do tripulante.'],
    ]);
  });

  it('nome só com espaços falta, e acima de 120 caracteres passa da coluna', () => {
    expect(erros({ nome: '   ' }).nome).toBe('Informe o nome do tripulante.');
    expect(erros({ nome: 'a'.repeat(121) }).nome).toBe('Use no máximo 120 caracteres.');
  });

  it.each(['123456', '11.22-33', '112 233', ''])('CANAC "%s" passa', (canac) => {
    expect(erros({ canac }).canac).toBeUndefined();
  });

  it.each(['ABCDEF', '12345', '12345678901', '12a456'])('CANAC "%s" é recusado', (canac) => {
    expect(erros({ canac }).canac).toBe('O CANAC tem 6 dígitos, como 123456.');
  });

  it.each(['3.115,5', '3115,5', '8.420', '0', '60.000'])('horas "%s" passam', (horasTotais) => {
    expect(erros({ horasTotais }).horasTotais).toBeUndefined();
  });

  it('horas ilegíveis, negativas, acima de 60.000 ou com duas casas são recusadas', () => {
    expect(erros({ horasTotais: 'abc' }).horasTotais).toBe(
      'Use só números, com vírgula para as casas decimais.',
    );
    expect(erros({ horasTotais: '-1' }).horasTotais).toBe('O mínimo é 0.');
    expect(erros({ horasTotais: '60.000,1' }).horasTotais).toBe('O máximo é 60.000.');
    expect(erros({ horasTotais: '12,35' }).horasTotais).toBe('Use no máximo 1 casa decimal.');
  });

  it('a validade vai de 01/01/2000 a cinco anos à frente; vencida é aceita', () => {
    expect(erros({ validadeCma: '1999-12-31' }).validadeCma).toBe(
      'Use uma data a partir de 01/01/2000.',
    );
    expect(erros({ validadeCht: '2031-10-08' }).validadeCht).toBe('Use uma data até 07/10/2031.');
    expect(erros({ validadeCht: '2031-10-07' }).validadeCht).toBeUndefined();
    expect(erros({ validadeCma: '2020-01-10' }).validadeCma).toBeUndefined();
  });

  it('data digitada pela metade é erro, mesmo com o valor vazio', () => {
    const resultado = erros({
      validadeCma: '',
      datasIncompletas: { validadeCma: true, validadeCht: false },
    });

    expect(resultado.validadeCma).toBe(
      'Data incompleta ou inexistente: complete-a ou apague o campo.',
    );
    expect(resultado.validadeCht).toBeUndefined();
  });

  it('telefone fora do formato e e-mail sem domínio com ponto são recusados', () => {
    expect(erros({ telefone: 'abc-xyz' }).telefone).toMatch(/^Use só números/);
    expect(erros({ telefone: '+55 11 98888-0000' }).telefone).toBeUndefined();
    expect(erros({ email: 'a@b' }).email).toBe(
      'Informe um e-mail válido, como nome@empresa.com.br.',
    );
    expect(erros({ email: 'x' }).email).toBe('Informe um e-mail válido, como nome@empresa.com.br.');
    expect(erros({ email: 'juliana@exemplo.com.br' }).email).toBeUndefined();
  });
});
