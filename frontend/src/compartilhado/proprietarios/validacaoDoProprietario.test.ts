import { describe, expect, it } from 'vitest';

import { validarProprietario, type RascunhoDoProprietario } from './validacaoDoProprietario';

const COMPLETO: RascunhoDoProprietario = {
  nome: 'Ricardo Meirelles',
  cpfCnpj: '529.982.247-25',
  email: 'ricardo@meirelles.com.br',
  telefone: '+55 11 98888-0000',
  corDeIdentificacao: 'PETROLEO',
};

function errosDe(mudanca: Partial<RascunhoDoProprietario>) {
  return validarProprietario({ ...COMPLETO, ...mudanca });
}

describe('validarProprietario', () => {
  it('o cadastro completo passa', () => {
    expect(Object.values(validarProprietario(COMPLETO)).filter(Boolean)).toEqual([]);
  });

  it('só o nome é obrigatório', () => {
    const erros = errosDe({ nome: '  ', cpfCnpj: '', email: '', telefone: '' });

    expect(erros).toEqual({
      nome: 'Informe o nome do proprietário.',
      cpfCnpj: undefined,
      email: undefined,
      telefone: undefined,
    });
  });

  it('nome feito só de espaço de largura zero não é nome', () => {
    expect(errosDe({ nome: '\u200b' }).nome).toBe(
      'O nome precisa ter ao menos uma letra ou um número.',
    );
  });

  it('nome passa de 120 caracteres', () => {
    expect(errosDe({ nome: 'A'.repeat(121) }).nome).toBe('Use no máximo 120 caracteres.');
  });

  it('aceita o CNPJ alfanumérico, com ou sem pontuação', () => {
    expect(errosDe({ cpfCnpj: '12.ABC.345/01DE-35' }).cpfCnpj).toBeUndefined();
    expect(errosDe({ cpfCnpj: '12abc34501de35' }).cpfCnpj).toBeUndefined();
  });

  it.each(['123.456.789-01', 'não tenho', '...', 'otavio@exemplo'])(
    'documento que não é CPF nem CNPJ é recusado, e não vira "sem documento": %s',
    (cpfCnpj) => {
      expect(errosDe({ cpfCnpj }).cpfCnpj).toMatch(/^Confira o documento/);
    },
  );

  it('e-mail precisa de domínio com ponto', () => {
    expect(errosDe({ email: 'otavio@exemplo' }).email).toBe(
      'Informe um e-mail válido, como nome@empresa.com.br.',
    );
    expect(errosDe({ email: 'a b@c.com' }).email).toBe(
      'Informe um e-mail válido, como nome@empresa.com.br.',
    );
  });

  it('telefone segue o formato comum', () => {
    expect(errosDe({ telefone: 'liga depois' }).telefone).toMatch(/^Use só números/);
    expect(errosDe({ telefone: '3000-0000' }).telefone).toBeUndefined();
  });
});
