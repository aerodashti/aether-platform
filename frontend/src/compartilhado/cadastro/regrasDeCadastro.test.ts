import { describe, expect, it } from 'vitest';

import { emailCompleto, nomeLegivel } from './regrasDeCadastro';

const MENSAGEM_DE_EMAIL = 'Informe um e-mail completo, como nome@empresa.com.br.';

describe('emailCompleto', () => {
  const regra = emailCompleto();

  it('aceita o endereço com domínio completo, mesmo com espaço nas pontas', () => {
    expect(regra('nome@empresa.com.br')).toBeUndefined();
    expect(regra(' nome@empresa.com ')).toBeUndefined();
  });

  it('recusa o domínio sem ponto ou com sufixo de uma letra, como o servidor', () => {
    expect(regra('nome@empresa')).toBe(MENSAGEM_DE_EMAIL);
    expect(regra('nome@empresa.c')).toBe(MENSAGEM_DE_EMAIL);
  });

  it('recusa o que o formato comum já recusa, com a mesma mensagem', () => {
    expect(regra('nome empresa.com')).toBe(MENSAGEM_DE_EMAIL);
  });

  it('deixa o vazio para o obrigatorio', () => {
    expect(regra('  ')).toBeUndefined();
  });
});

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
