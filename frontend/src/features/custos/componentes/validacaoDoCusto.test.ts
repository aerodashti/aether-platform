import { describe, expect, it } from 'vitest';

import type { RascunhoDoCusto } from './rascunhoDoCusto';
import { validarCusto, type ContextoDoCusto } from './validacaoDoCusto';

const CONTEXTO: ContextoDoCusto = { hoje: '2026-10-07', donos: 'pronta' };

const PREENCHIDO: RascunhoDoCusto = {
  aeronaveId: '1',
  categoria: 'ABASTECIMENTO',
  data: '2026-09-08',
  proprietarioId: '',
  relatorioDeVoo: '',
  moeda: 'BRL',
  valor: '15.725,00',
  cambio: '',
  descricao: 'Jet A-1',
  notaFiscal: '',
};

function errosDe(mudanca: Partial<RascunhoDoCusto>, contexto = CONTEXTO) {
  return validarCusto({ ...PREENCHIDO, ...mudanca }, contexto);
}

function semErros(erros: ReturnType<typeof validarCusto>) {
  return Object.values(erros).filter(Boolean);
}

describe('validarCusto', () => {
  it('aceita o lançamento completo em BRL, sem câmbio', () => {
    expect(semErros(errosDe({}))).toEqual([]);
  });

  it('pede o que o servidor exige, com a mensagem do campo', () => {
    const erros = errosDe({ aeronaveId: '', categoria: '', data: '', valor: '', descricao: ' ' });

    expect(erros).toMatchObject({
      aeronaveId: 'Escolha a aeronave.',
      categoria: 'Escolha a categoria.',
      data: 'Informe a data do custo.',
      valor: 'Informe o valor.',
      descricao: 'Informe a descrição.',
    });
  });

  it.each([
    ['abc', 'Use só números, com vírgula para as casas decimais.'],
    ['1e3', 'Use só números, com vírgula para as casas decimais.'],
    ['0', 'Informe um valor maior que 0.'],
    ['-5', 'Informe um valor maior que 0.'],
    ['10,555', 'Use no máximo 2 casas decimais.'],
    ['1.000.000.000.000', 'O máximo é 999.999.999.999,99.'],
  ])('recusa o valor "%s" no campo', (valor, mensagem) => {
    expect(errosDe({ valor }).valor).toBe(mensagem);
  });

  it('em USD, o câmbio é obrigatório, positivo, até 100 e com até 4 casas', () => {
    expect(errosDe({ moeda: 'USD' }).cambio).toBe('Informe o câmbio do dia.');
    expect(errosDe({ moeda: 'USD', cambio: '0' }).cambio).toBe('Informe um valor maior que 0.');
    expect(errosDe({ moeda: 'USD', cambio: '150' }).cambio).toBe('O máximo é 100.');
    expect(errosDe({ moeda: 'USD', cambio: '4,92235' }).cambio).toBe(
      'Use no máximo 4 casas decimais.',
    );
    expect(errosDe({ moeda: 'USD', cambio: '4,9223' }).cambio).toBeUndefined();
  });

  it('em BRL, o câmbio que ficou no campo não conta', () => {
    expect(errosDe({ moeda: 'BRL', cambio: 'null' }).cambio).toBeUndefined();
  });

  it('em USD, recusa no valor o BRL derivado que não cabe na coluna', () => {
    expect(errosDe({ moeda: 'USD', valor: '10.000.000.000,00', cambio: '100' }).valor).toBe(
      'Convertido para reais, o lançamento passa de R$ 999.999.999.999,99.',
    );
    expect(errosDe({ moeda: 'USD', valor: '9.999.999.999,99', cambio: '100' }).valor).toBe(
      undefined,
    );
  });

  it('a data vai de 01/01/2000 até 31 dias à frente de hoje', () => {
    expect(errosDe({ data: '1999-12-31' }).data).toBe('Use uma data a partir de 01/01/2000.');
    expect(errosDe({ data: '2026-11-08' }).data).toBe('Use uma data até 07/11/2026.');
    expect(errosDe({ data: '2026-11-07' }).data).toBeUndefined();
  });

  it('não salva enquanto a lista de proprietários não carregou: iria como rateio sem querer', () => {
    expect(errosDe({}, { ...CONTEXTO, donos: 'carregando' }).proprietarioId).toBe(
      'Aguarde a lista de proprietários carregar.',
    );
    expect(errosDe({}, { ...CONTEXTO, donos: 'falhou' }).proprietarioId).toBe(
      'A lista de proprietários não carregou: tente de novo antes de salvar.',
    );
  });

  it('diz o limite das colunas de texto', () => {
    const erros = errosDe({
      relatorioDeVoo: 'R'.repeat(21),
      descricao: 'D'.repeat(201),
      notaFiscal: 'N'.repeat(41),
    });

    expect(erros).toMatchObject({
      relatorioDeVoo: 'Use no máximo 20 caracteres.',
      descricao: 'Use no máximo 200 caracteres.',
      notaFiscal: 'Use no máximo 40 caracteres.',
    });
  });
});
