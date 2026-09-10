import { describe, expect, it } from 'vitest';

import { formatarCpfCnpj, linhaDeContato } from './rotulos';

describe('formatarCpfCnpj', () => {
  it('pontua CPF e CNPJ pelos comprimentos', () => {
    expect(formatarCpfCnpj('52998224725')).toBe('529.982.247-25');
    expect(formatarCpfCnpj('11444777000161')).toBe('11.444.777/0001-61');
  });

  it('sem documento é travessão, não vazio', () => {
    expect(formatarCpfCnpj(undefined)).toBe('—');
    expect(formatarCpfCnpj('')).toBe('—');
  });

  it('comprimento inesperado sai como veio', () => {
    expect(formatarCpfCnpj('123')).toBe('123');
  });
});

describe('linhaDeContato', () => {
  it('junta e-mail e telefone com ponto mediano', () => {
    expect(linhaDeContato('a@b.com', '+55 11 90000-0000')).toBe('a@b.com · +55 11 90000-0000');
  });

  it('só mostra o que existe', () => {
    expect(linhaDeContato('a@b.com', undefined)).toBe('a@b.com');
    expect(linhaDeContato(undefined, undefined)).toBe('');
  });
});
