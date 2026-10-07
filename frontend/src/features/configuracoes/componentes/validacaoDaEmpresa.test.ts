import { describe, expect, it } from 'vitest';

import { validarDadosDaEmpresa, type RascunhoDaEmpresa } from './validacaoDaEmpresa';

const VALIDO: RascunhoDaEmpresa = {
  nomeFantasia: 'Administra Air',
  razaoSocial: 'Administra Air Gestão de Aeronaves LTDA',
  email: 'contato@administraair.com.br',
  telefone: '+55 11 3000-0000',
};

function errosCom(parcial: Partial<RascunhoDaEmpresa>) {
  return validarDadosDaEmpresa({ ...VALIDO, ...parcial });
}

describe('validarDadosDaEmpresa', () => {
  it('aceita os dados de partida da empresa', () => {
    expect(Object.values(validarDadosDaEmpresa(VALIDO)).filter(Boolean)).toEqual([]);
  });

  it('pede os quatro campos, e espaço não conta como preenchido', () => {
    const erros = validarDadosDaEmpresa({
      nomeFantasia: ' ',
      razaoSocial: '',
      email: '',
      telefone: '   ',
    });

    expect(erros).toEqual({
      nomeFantasia: 'Informe o nome fantasia.',
      razaoSocial: 'Informe a razão social.',
      email: 'Informe o e-mail.',
      telefone: 'Informe o telefone.',
    });
  });

  it('recusa e-mail sem ponto no domínio, que o servidor também recusa', () => {
    expect(errosCom({ email: 'contato@empresa' }).email).toBe(
      'Informe um e-mail completo, como nome@empresa.com.br.',
    );
    expect(errosCom({ email: 'nao-e-email' }).email).toBe(
      'Informe um e-mail completo, como nome@empresa.com.br.',
    );
  });

  it('recusa nome fantasia e razão social sem letra nem dígito, como o servidor', () => {
    const erros = errosCom({ nomeFantasia: '---', razaoSocial: '\u200B' });

    expect(erros.nomeFantasia).toBe('Use letras ou números, e não só espaços ou sinais.');
    expect(erros.razaoSocial).toBe('Use letras ou números, e não só espaços ou sinais.');
  });

  it('recusa telefone sem dígitos suficientes', () => {
    expect(errosCom({ telefone: 'abc' }).telefone).toMatch(/Use só números/);
    expect(errosCom({ telefone: '1' }).telefone).toMatch(/Use só números/);
    expect(errosCom({ telefone: '(11) 3000-0000' }).telefone).toBeUndefined();
  });

  it('diz o limite da coluna antes de o servidor recusar', () => {
    expect(errosCom({ nomeFantasia: 'a'.repeat(121) }).nomeFantasia).toBe(
      'Use no máximo 120 caracteres.',
    );
    expect(errosCom({ razaoSocial: 'a'.repeat(181) }).razaoSocial).toBe(
      'Use no máximo 180 caracteres.',
    );
  });
});
