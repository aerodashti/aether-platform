import { describe, expect, it } from 'vitest';

import { validarCodigo } from './validacaoDoCodigo';

describe('validarCodigo', () => {
  it('cobra o código e o formato de seis dígitos', () => {
    expect(validarCodigo({ codigo: '' })).toEqual({ codigo: 'Informe o código.' });
    expect(validarCodigo({ codigo: '51927' })).toEqual({ codigo: 'O código tem seis dígitos.' });
  });

  it('passa com seis dígitos', () => {
    expect(validarCodigo({ codigo: '042917' })).toEqual({ codigo: undefined });
  });
});
