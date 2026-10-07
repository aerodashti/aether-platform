import { describe, expect, it } from 'vitest';

import { validarConvite, type RascunhoDoConvite } from './validacaoDoConvite';

const VALIDO: RascunhoDoConvite = {
  nome: 'Rafael Prado',
  email: 'rafael@administraair.com.br',
  papel: 'PILOTO',
};

function errosCom(parcial: Partial<RascunhoDoConvite>) {
  return validarConvite({ ...VALIDO, ...parcial });
}

describe('validarConvite', () => {
  it('aceita o convite completo', () => {
    expect(Object.values(validarConvite(VALIDO)).filter(Boolean)).toEqual([]);
  });

  it('pede nome e e-mail, e espaço não conta como preenchido', () => {
    expect(errosCom({ nome: '   ', email: '' })).toEqual({
      nome: 'Informe o nome.',
      email: 'Informe o e-mail.',
      papel: undefined,
    });
  });

  it('recusa o que não é e-mail e o domínio sem ponto, que o convite nunca alcançaria', () => {
    expect(errosCom({ email: 'nao-e-email' }).email).toBe(
      'Informe um e-mail completo, como nome@empresa.com.br.',
    );
    expect(errosCom({ email: 'fulano@exemplo' }).email).toBe(
      'Informe um e-mail completo, como nome@empresa.com.br.',
    );
  });

  it('diz o limite das colunas', () => {
    expect(errosCom({ nome: 'a'.repeat(121) }).nome).toBe('Use no máximo 120 caracteres.');
    expect(errosCom({ email: `${'a'.repeat(170)}@empresa.com.br` }).email).toBe(
      'Use no máximo 180 caracteres.',
    );
  });
});
