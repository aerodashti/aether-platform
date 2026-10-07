import { describe, expect, it } from 'vitest';

import { totalDaTroca } from './totalDaTroca';

describe('totalDaTroca', () => {
  it('horas × R$/hora no formato brasileiro', () => {
    expect(totalDaTroca('2,5', '14.800')).toBe(37000);
    expect(totalDaTroca('2,5', '14.800,00')).toBe(37000);
  });

  it('arredonda aos centavos como o servidor, meio para cima', () => {
    // Em ponto flutuante daria 37.000,824999…, um centavo a menos do que a lista mostraria.
    expect(totalDaTroca('2,5', '14.800,33')).toBe(37000.83);
    expect(totalDaTroca('0,1', '0,05')).toBe(0.01);
  });

  it('sem um dos dois, ou com texto, não há total', () => {
    expect(totalDaTroca('2,5', '')).toBeNull();
    expect(totalDaTroca('', '14.800')).toBeNull();
    expect(totalDaTroca('2:30', '14.800')).toBeNull();
    expect(totalDaTroca('2,5', 'abc')).toBeNull();
  });

  it('no teto das duas colunas, o total continua exato', () => {
    expect(totalDaTroca('1.000', '9.999.999.999,99')).toBe(9_999_999_999_990);
  });
});
