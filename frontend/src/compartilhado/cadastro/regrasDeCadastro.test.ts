import { describe, expect, it } from 'vitest';

import { nomeLegivel } from './regrasDeCadastro';

describe('nomeLegivel', () => {
  const regra = nomeLegivel();

  it('aceita nome com letra ou dígito, acentuado ou não', () => {
    expect(regra('Conceição')).toBeUndefined();
    expect(regra('4 Ventos')).toBeUndefined();
  });

  it('recusa nome feito só de pontuação ou de espaço de largura zero', () => {
    expect(regra('...')).toBe('Use letras ou números, e não só espaços ou sinais.');
    expect(regra('​​')).toBe('Use letras ou números, e não só espaços ou sinais.');
  });
});
