import { describe, expect, it } from 'vitest';

import type { RascunhoDoRendimento } from './rascunhoDoRendimento';
import { validarRendimento } from './validacaoDoRendimento';

const HOJE = { hoje: '2026-10-07' };

const PREENCHIDO: RascunhoDoRendimento = {
  aeronaveId: '1',
  data: '2026-09-28',
  aplicacao: 'CDB DI',
  saldoAplicado: '',
  taxa: '',
  valor: '948,22',
};

function errosDe(mudanca: Partial<RascunhoDoRendimento>) {
  return validarRendimento({ ...PREENCHIDO, ...mudanca }, HOJE);
}

describe('validarRendimento', () => {
  it('aceita o rendimento sem o extrato, que é opcional', () => {
    expect(Object.values(errosDe({})).filter(Boolean)).toEqual([]);
  });

  it('pede o que o servidor exige, com a mensagem do campo', () => {
    expect(errosDe({ aeronaveId: '', data: '', aplicacao: '  ', valor: '' })).toMatchObject({
      aeronaveId: 'Escolha a aeronave.',
      data: 'Informe a data do crédito.',
      aplicacao: 'Informe a aplicação.',
      valor: 'Informe o rendimento.',
    });
  });

  it('a data do crédito vai de 01/01/2000 até hoje', () => {
    expect(errosDe({ data: '2026-10-08' }).data).toBe(
      'Registre o rendimento depois que o crédito cair: use uma data até hoje.',
    );
    expect(errosDe({ data: '1900-01-01' }).data).toBe('Use uma data a partir de 01/01/2000.');
  });

  it('o saldo aplicado, quando vem, é reais com centavos dentro da coluna', () => {
    expect(errosDe({ saldoAplicado: 'R$ 104.200' }).saldoAplicado).toBeUndefined();
    expect(errosDe({ saldoAplicado: 'abc' }).saldoAplicado).toBe(
      'Use só números, com vírgula para as casas decimais.',
    );
    expect(errosDe({ saldoAplicado: '0' }).saldoAplicado).toBe('Informe um valor maior que 0.');
    expect(errosDe({ saldoAplicado: '100,555' }).saldoAplicado).toBe(
      'Use no máximo 2 casas decimais.',
    );
  });

  it('a taxa aceita o símbolo do extrato e vai até 10% com 4 casas', () => {
    expect(errosDe({ taxa: '0,91%' }).taxa).toBeUndefined();
    expect(errosDe({ taxa: '0,9123' }).taxa).toBeUndefined();
    expect(errosDe({ taxa: '0,91234' }).taxa).toBe('Use no máximo 4 casas decimais.');
    expect(errosDe({ taxa: '1000' }).taxa).toBe('O máximo é 10.');
    expect(errosDe({ taxa: '-1' }).taxa).toBe('Informe um valor maior que 0.');
    expect(errosDe({ taxa: '0,9 ao mês' }).taxa).toBe(
      'Use só números, com vírgula para as casas decimais.',
    );
  });

  it('o rendimento tem o limite da coluna', () => {
    expect(errosDe({ valor: '1,239' }).valor).toBe('Use no máximo 2 casas decimais.');
    expect(errosDe({ valor: '1.000.000.000.000' }).valor).toBe('O máximo é 999.999.999.999,99.');
  });

  it('a aplicação tem o limite da coluna', () => {
    expect(errosDe({ aplicacao: 'x'.repeat(61) }).aplicacao).toBe('Use no máximo 60 caracteres.');
  });
});
