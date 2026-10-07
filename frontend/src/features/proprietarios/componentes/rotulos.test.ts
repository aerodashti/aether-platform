import { describe, expect, it } from 'vitest';

import { linhaDeContato } from './rotulos';

describe('linhaDeContato', () => {
  it('junta e-mail e telefone com ponto mediano', () => {
    expect(linhaDeContato('a@b.com', '+55 11 90000-0000')).toBe('a@b.com · +55 11 90000-0000');
  });

  it('só mostra o que existe', () => {
    expect(linhaDeContato('a@b.com', undefined)).toBe('a@b.com');
    expect(linhaDeContato(undefined, undefined)).toBe('');
  });
});
