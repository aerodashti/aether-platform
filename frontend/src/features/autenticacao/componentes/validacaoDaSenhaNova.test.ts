import { describe, expect, it } from 'vitest';

import { validarSenhaNova } from './validacaoDaSenhaNova';

describe('validarSenhaNova', () => {
  it('acusa a senha e a confirmação ao mesmo tempo, cada uma com a sua mensagem', () => {
    expect(validarSenhaNova({ novaSenha: 'curta', confirmacao: 'outra' })).toEqual({
      novaSenha: 'A senha precisa de ao menos 8 caracteres.',
      confirmacao: 'A confirmação não confere com a nova senha.',
    });
  });

  it('cobra a confirmação vazia', () => {
    expect(validarSenhaNova({ novaSenha: 'senha-nova-longa', confirmacao: '' })).toEqual({
      novaSenha: undefined,
      confirmacao: 'Repita a nova senha.',
    });
  });

  it('passa com a senha dentro da regra e a confirmação igual', () => {
    expect(
      validarSenhaNova({ novaSenha: 'senha-nova-longa', confirmacao: 'senha-nova-longa' }),
    ).toEqual({ novaSenha: undefined, confirmacao: undefined });
  });
});
