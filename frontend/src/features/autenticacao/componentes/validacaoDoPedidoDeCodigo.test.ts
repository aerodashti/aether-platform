import { describe, expect, it } from 'vitest';

import { validarPedidoDeCodigo } from './validacaoDoPedidoDeCodigo';

describe('validarPedidoDeCodigo', () => {
  it('cobra o e-mail e recusa o que o servidor recusaria', () => {
    expect(validarPedidoDeCodigo({ email: '' })).toEqual({ email: 'Informe o e-mail.' });
    expect(validarPedidoDeCodigo({ email: 'a,b@exemplo.test' }).email).toBeDefined();
  });

  it('passa com um e-mail válido', () => {
    expect(validarPedidoDeCodigo({ email: 'leonardo@administraair.com.br' })).toEqual({
      email: undefined,
    });
  });
});
