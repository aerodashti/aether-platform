import { describe, expect, it } from 'vitest';

import {
  codigoDeSeisDigitos,
  digitosDoCodigo,
  emailInformado,
  senhaDoLogin,
  senhaNova,
} from './regrasDeAcesso';

describe('regras de acesso', () => {
  it('o e-mail segue o @Email e o FormatoDeEmail do backend: domínio completo', () => {
    expect(emailInformado('')).toBe('Informe o e-mail.');
    expect(emailInformado('a,b@exemplo.test')).toBe(
      'Informe um e-mail válido, como nome@empresa.com.br.',
    );
    expect(emailInformado('ninguem@exemplo')).toBe(
      'Informe um e-mail válido, como nome@empresa.com.br.',
    );
    expect(emailInformado('  leonardo@administraair.com.br ')).toBeUndefined();
  });

  it('a senha do login só com espaços é falta, e acima de 72 caracteres passa do teto', () => {
    expect(senhaDoLogin('        ')).toBe('Informe a senha.');
    expect(senhaDoLogin('a'.repeat(72))).toBeUndefined();
    expect(senhaDoLogin('a'.repeat(73))).toBe('A senha tem no máximo 72 caracteres.');
  });

  it('a senha nova vai de 8 caracteres a 72 bytes', () => {
    expect(senhaNova('        ')).toBe('Informe a nova senha.');
    expect(senhaNova('curta')).toBe('A senha precisa de ao menos 8 caracteres.');
    expect(senhaNova('a'.repeat(72))).toBeUndefined();
    expect(senhaNova('ç'.repeat(36))).toBeUndefined();
  });

  it('conta bytes como o BCrypt: 37 letras acentuadas já passam do teto', () => {
    expect(senhaNova('ç'.repeat(37))).toBe(
      'A senha passa do limite de 72 caracteres (letras acentuadas e símbolos contam como dois ou mais).',
    );
  });

  it('o código tem seis dígitos', () => {
    expect(codigoDeSeisDigitos('')).toBe('Informe o código.');
    expect(codigoDeSeisDigitos('51927')).toBe('O código tem seis dígitos.');
    expect(codigoDeSeisDigitos('519274')).toBeUndefined();
  });

  it('do texto colado ficam só os dígitos, cortados depois do filtro', () => {
    expect(digitosDoCodigo('519 274')).toBe('519274');
    expect(digitosDoCodigo('    519-274')).toBe('519274');
    expect(digitosDoCodigo('5192741')).toBe('519274');
  });
});
