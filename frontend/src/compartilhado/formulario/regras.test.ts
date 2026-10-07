import { describe, expect, it } from 'vitest';

import {
  dataEntre,
  email,
  numero,
  obrigatorio,
  primeiraFalha,
  tamanhoMaximo,
  telefone,
} from './regras';

describe('regras de formulário', () => {
  it('obrigatório recusa vazio e só espaços', () => {
    const regra = obrigatorio('Informe a descrição.');
    expect(regra('')).toBe('Informe a descrição.');
    expect(regra('   ')).toBe('Informe a descrição.');
    expect(regra('Pouso')).toBeUndefined();
  });

  it('tamanho máximo diz o limite', () => {
    expect(tamanhoMaximo(3)('abcd')).toBe('Use no máximo 3 caracteres.');
    expect(tamanhoMaximo(3)('abc')).toBeUndefined();
  });

  it('número: texto, casas, mínimo, maior que e máximo', () => {
    expect(numero()('abc')).toBe('Use só números, com vírgula para as casas decimais.');
    expect(numero({ casas: 2 })('1,234')).toBe('Use no máximo 2 casas decimais.');
    expect(numero({ casas: 0 })('1,5')).toBe('Use um número inteiro.');
    expect(numero({ maiorQue: 0 })('0')).toBe('Informe um valor maior que 0.');
    expect(numero({ minimo: 1 })('0')).toBe('O mínimo é 1.');
    expect(numero({ maximo: 999_999_999_999.99 })('1.000.000.000.000')).toBe(
      'O máximo é 999.999.999.999,99.',
    );
    expect(numero({ maiorQue: 0, casas: 2 })('1.850,00')).toBeUndefined();
  });

  it('número vazio passa — quem exige é o obrigatório', () => {
    expect(numero({ maiorQue: 0 })('')).toBeUndefined();
  });

  it('data dentro do intervalo, com a mensagem em dd/mm/aaaa', () => {
    const regra = dataEntre({ minimo: '2000-01-01', maximo: '2026-10-07' });
    expect(regra('1999-12-31')).toBe('Use uma data a partir de 01/01/2000.');
    expect(regra('2026-10-08')).toBe('Use uma data até 07/10/2026.');
    expect(regra('2026-10-07')).toBeUndefined();
  });

  it('e-mail na forma que o backend aceita', () => {
    const regra = email();
    expect(regra('nome@exemplo.test')).toBeUndefined();
    expect(regra('ninguem@exemplo')).toBeUndefined();
    expect(regra('a,b@exemplo.test')).toBeDefined();
    expect(regra('sem-arroba')).toBeDefined();
  });

  it('primeira falha segue a ordem das regras', () => {
    expect(primeiraFalha('', obrigatorio('Informe o valor.'), numero({ maiorQue: 0 }))).toBe(
      'Informe o valor.',
    );
    expect(primeiraFalha('0', obrigatorio('Informe o valor.'), numero({ maiorQue: 0 }))).toBe(
      'Informe um valor maior que 0.',
    );
  });
});

describe('telefone', () => {
  it('aceita os formatos comuns e recusa texto ou número curto', () => {
    const regra = telefone();
    expect(regra('+55 11 98888-0000')).toBeUndefined();
    expect(regra('(11) 3000-0000')).toBeUndefined();
    expect(regra('abc')).toBeDefined();
    expect(regra('1')).toBeDefined();
  });
});
