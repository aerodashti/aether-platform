import { describe, expect, it } from 'vitest';

import { validarEntrada } from './validacaoDaEntrada';

describe('validarEntrada', () => {
  it('cobra os dois campos de uma vez', () => {
    expect(validarEntrada({ email: '', senha: '' })).toEqual({
      email: 'Informe o e-mail.',
      senha: 'Informe a senha.',
    });
  });

  it('passa com e-mail e senha preenchidos', () => {
    expect(
      validarEntrada({ email: 'leonardo@administraair.com.br', senha: 'aether-dev-2026' }),
    ).toEqual({ email: undefined, senha: undefined });
  });
});
