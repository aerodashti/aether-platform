import { describe, expect, it } from 'vitest';

import { validarTrocaDeSenha, type RascunhoDaTroca } from './validacaoDaTrocaDeSenha';

const VALIDO: RascunhoDaTroca = {
  senhaAtual: 'a-senha-atual',
  novaSenha: 'a-nova-senha',
  confirmacao: 'a-nova-senha',
  codigo: '042917',
};

function errosCom(parcial: Partial<RascunhoDaTroca>) {
  return validarTrocaDeSenha({ ...VALIDO, ...parcial });
}

describe('validarTrocaDeSenha', () => {
  it('aceita a troca completa', () => {
    expect(Object.values(validarTrocaDeSenha(VALIDO)).filter(Boolean)).toEqual([]);
  });

  it('pede cada campo vazio pelo nome', () => {
    expect(
      validarTrocaDeSenha({ senhaAtual: '', novaSenha: '', confirmacao: '', codigo: '' }),
    ).toEqual({
      senhaAtual: 'Informe a senha atual.',
      novaSenha: 'Informe a nova senha.',
      confirmacao: 'Repita a nova senha.',
      codigo: 'Informe o código enviado por e-mail.',
    });
  });

  it('nova senha só de espaços é falta, como no @NotBlank do servidor', () => {
    expect(errosCom({ novaSenha: '          ' }).novaSenha).toBe('Informe a nova senha.');
  });

  it('nova senha fora de 8 a 72 caracteres', () => {
    expect(errosCom({ novaSenha: 'curta', confirmacao: 'curta' }).novaSenha).toBe(
      'A senha deve ter entre 8 e 72 caracteres.',
    );
    expect(errosCom({ novaSenha: 'a'.repeat(73) }).novaSenha).toBe(
      'A senha deve ter entre 8 e 72 caracteres.',
    );
  });

  it('mede a nova senha em bytes, como o BCrypt: 40 "ç" passam em caracteres e não cabem', () => {
    expect(errosCom({ novaSenha: 'ç'.repeat(40) }).novaSenha).toBe(
      'A senha passa do limite: letras com acento e emojis contam como mais de um caractere.',
    );
    expect(errosCom({ novaSenha: 'ç'.repeat(36) }).novaSenha).toBeUndefined();
  });

  it('nova senha igual à atual é recusada', () => {
    expect(errosCom({ novaSenha: VALIDO.senhaAtual }).novaSenha).toBe(
      'A nova senha precisa ser diferente da atual.',
    );
  });

  it('confirmação diferente da nova senha', () => {
    expect(errosCom({ confirmacao: 'outra-coisa' }).confirmacao).toBe(
      'As duas senhas não conferem.',
    );
  });

  it('código só com seis dígitos', () => {
    expect(errosCom({ codigo: '42' }).codigo).toBe('O código tem seis dígitos.');
    expect(errosCom({ codigo: '04291a' }).codigo).toBe('O código tem seis dígitos.');
  });
});
