import { describe, expect, it } from 'vitest';

import { cpfCnpjEhValido, formatarCpfCnpj, mascararCpfCnpj, normalizarCpfCnpj } from './cpfCnpj';

describe('normalizarCpfCnpj', () => {
  it('tira pontuação e espaços e põe as letras em maiúsculas', () => {
    expect(normalizarCpfCnpj('529.982.247-25')).toBe('52998224725');
    expect(normalizarCpfCnpj(' 12.abc.345/01de-35 ')).toBe('12ABC34501DE35');
  });
});

describe('cpfCnpjEhValido', () => {
  it('aceita CPF e CNPJ numéricos com os verificadores certos', () => {
    expect(cpfCnpjEhValido('52998224725')).toBe(true);
    expect(cpfCnpjEhValido('12345678909')).toBe(true);
    expect(cpfCnpjEhValido('11444777000161')).toBe(true);
  });

  it('aceita o CNPJ alfanumérico do exemplo da Receita', () => {
    expect(cpfCnpjEhValido('12ABC34501DE35')).toBe(true);
  });

  it.each(['52998224726', '12345678901', '11444777000162', '12ABC34501DE36'])(
    'recusa verificador errado: %s',
    (documento) => {
      expect(cpfCnpjEhValido(documento)).toBe(false);
    },
  );

  it.each(['5299822472A', '12ABC34501DEA5', 'NAOTENHO', '123', '', '11111111111'])(
    'recusa o que não é documento: %s',
    (documento) => {
      expect(cpfCnpjEhValido(documento)).toBe(false);
    },
  );
});

describe('mascararCpfCnpj', () => {
  it('pontua o CPF enquanto se digita', () => {
    expect(mascararCpfCnpj('529')).toBe('529');
    expect(mascararCpfCnpj('5299')).toBe('529.9');
    expect(mascararCpfCnpj('52998224725')).toBe('529.982.247-25');
  });

  it('passa para o CNPJ no 12º caractere ou na primeira letra', () => {
    expect(mascararCpfCnpj('114447770001')).toBe('11.444.777/0001');
    expect(mascararCpfCnpj('12abc')).toBe('12.ABC');
    expect(mascararCpfCnpj('12abc34501de35')).toBe('12.ABC.345/01DE-35');
  });

  it('o que não cabe em nenhum dos dois fica como veio', () => {
    expect(mascararCpfCnpj('otavio@exemplo')).toBe('otavio@exemplo');
    expect(mascararCpfCnpj('529982247251234')).toBe('529982247251234');
  });
});

describe('formatarCpfCnpj', () => {
  it('pontua o documento como o servidor o devolve', () => {
    expect(formatarCpfCnpj('52998224725')).toBe('529.982.247-25');
    expect(formatarCpfCnpj('11444777000161')).toBe('11.444.777/0001-61');
    expect(formatarCpfCnpj('12ABC34501DE35')).toBe('12.ABC.345/01DE-35');
  });

  it('sem documento é travessão, e comprimento inesperado sai como veio', () => {
    expect(formatarCpfCnpj(undefined)).toBe('—');
    expect(formatarCpfCnpj(null)).toBe('—');
    expect(formatarCpfCnpj('123')).toBe('123');
  });
});
