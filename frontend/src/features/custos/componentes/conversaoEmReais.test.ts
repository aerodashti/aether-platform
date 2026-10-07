import { describe, expect, it } from 'vitest';

import { centavosEmReais, emReais } from './conversaoEmReais';

describe('emReais', () => {
  it('converte com duas casas, como o servidor grava', () => {
    expect(emReais('1.200', '4,9223')).toBe(5906.76);
    expect(emReais('1000', '4,9224')).toBe(4922.4);
  });

  it('arredonda o meio centavo para cima, sem o erro do ponto flutuante', () => {
    expect(emReais('0,01', '0,5')).toBe(0.01);
    // Em number, 0,29 × 0,5 × 100 dá 14,4999…, e o arredondamento cairia para 0,14.
    expect(emReais('0,29', '0,5')).toBe(0.15);
  });

  it('não converte o que não é número positivo', () => {
    expect(emReais('abc', '4,9')).toBeNull();
    expect(emReais('100', '')).toBeNull();
    expect(emReais('0', '4,9')).toBeNull();
  });
});

describe('centavosEmReais', () => {
  it('é exato acima de 2^53, onde o number perderia os centavos', () => {
    expect(centavosEmReais('999.999.999.999,99', '100')).toBe(9_999_999_999_999_900n);
  });
});
