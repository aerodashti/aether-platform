import { describe, expect, it } from 'vitest';

import type { RascunhoDaConfiguracao } from './rascunhoDaConfiguracaoFinanceira';
import { validarConfiguracaoFinanceira } from './validacaoDaConfiguracaoFinanceira';

const CONFIGURACAO: RascunhoDaConfiguracao = {
  baseDoRateio: 'POR_USO',
  modeloDeAporte: 'FIXO',
  periodicidadeDoAporteMeses: '1',
  valorDoAporte: 'R$ 85.000,00',
  diaDeFechamento: '5',
  saldoDeAbertura: '-12.500,00',
};

function validar(mudancas: Partial<RascunhoDaConfiguracao>) {
  return validarConfiguracaoFinanceira({ ...CONFIGURACAO, ...mudancas });
}

describe('validarConfiguracaoFinanceira', () => {
  it('aceita reais com milhar, "R$" e saldo negativo', () => {
    expect(Object.values(validarConfiguracaoFinanceira(CONFIGURACAO)).filter(Boolean)).toEqual([]);
    expect(validar({ saldoDeAbertura: '12.500' }).saldoDeAbertura).toBeUndefined();
  });

  it('o aporte fixo exige valor maior que zero, com duas casas e o teto da coluna', () => {
    expect(validar({ valorDoAporte: '' }).valorDoAporte).toBe('Informe o valor de cada aporte.');
    expect(validar({ valorDoAporte: '0' }).valorDoAporte).toBe('Informe um valor maior que 0.');
    expect(validar({ valorDoAporte: '1,239' }).valorDoAporte).toBe(
      'Use no máximo 2 casas decimais.',
    );
    expect(validar({ valorDoAporte: '1.000.000.000.000' }).valorDoAporte).toBe(
      'O máximo é 999.999.999.999,99.',
    );
  });

  it('no proporcional ao uso o valor do aporte não se aplica', () => {
    expect(
      validar({ modeloDeAporte: 'PROPORCIONAL_AO_USO', valorDoAporte: 'abc' }).valorDoAporte,
    ).toBeUndefined();
  });

  it('o dia de fechamento é inteiro de 1 a 28', () => {
    expect(validar({ diaDeFechamento: '' }).diaDeFechamento).toBe('Informe o dia de fechamento.');
    expect(validar({ diaDeFechamento: '28,9' }).diaDeFechamento).toBe('Use um número inteiro.');
    expect(validar({ diaDeFechamento: '29' }).diaDeFechamento).toBe('O máximo é 28.');
    expect(validar({ diaDeFechamento: '0' }).diaDeFechamento).toBe('O mínimo é 1.');
  });

  it('o saldo é obrigatório, legível e dentro da coluna para mais ou para menos', () => {
    expect(validar({ saldoDeAbertura: '' }).saldoDeAbertura).toBe(
      'Informe o saldo do fundo no cadastro.',
    );
    expect(validar({ saldoDeAbertura: '12,5,0' }).saldoDeAbertura).toBe(
      'Use só números, com vírgula para as casas decimais.',
    );
    expect(validar({ saldoDeAbertura: '-1.000.000.000.000' }).saldoDeAbertura).toBe(
      'O mínimo é -999.999.999.999,99.',
    );
  });
});
