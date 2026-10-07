import { describe, expect, it } from 'vitest';

import type { RascunhoDoAporte } from './rascunhoDoAporte';
import { ultimaCompetencia, validarAporte, type ContextoDoAporte } from './validacaoDoAporte';

const CONTEXTO: ContextoDoAporte = { hoje: '2026-10-07', donos: 'pronta' };

const PREENCHIDO: RascunhoDoAporte = {
  aeronaveId: '1',
  proprietarioId: '7',
  data: '2026-10-03',
  competencia: '2026-09',
  valor: '25.000,00',
};

function errosDe(mudanca: Partial<RascunhoDoAporte>, contexto = CONTEXTO) {
  return validarAporte({ ...PREENCHIDO, ...mudanca }, contexto);
}

describe('validarAporte', () => {
  it('aceita o aporte completo', () => {
    expect(Object.values(errosDe({})).filter(Boolean)).toEqual([]);
  });

  it('pede o que o servidor exige, com a mensagem do campo', () => {
    expect(
      errosDe({ aeronaveId: '', data: '', competencia: '', valor: ' ' }, CONTEXTO),
    ).toMatchObject({
      aeronaveId: 'Escolha a aeronave.',
      data: 'Informe a data do crédito.',
      competencia: 'Informe a competência.',
      valor: 'Informe o valor.',
    });
  });

  it('sem aeronave, o que falta é a aeronave, não o proprietário', () => {
    expect(errosDe({ aeronaveId: '', proprietarioId: '' }).proprietarioId).toBeUndefined();
  });

  it.each([
    ['pronta', 'Escolha o proprietário.'],
    ['carregando', 'Aguarde a lista de proprietários carregar.'],
    ['falhou', 'A lista de proprietários não carregou: tente de novo.'],
    ['semContrato', 'A aeronave não tem contrato vigente: cadastre o contrato antes do aporte.'],
  ] as const)('sem proprietário com a lista %s, diz o porquê', (donos, mensagem) => {
    expect(errosDe({ proprietarioId: '' }, { ...CONTEXTO, donos }).proprietarioId).toBe(mensagem);
  });

  it.each([
    ['25.000', undefined],
    ['1.234.567,89', undefined],
    ['abc', 'Use só números, com vírgula para as casas decimais.'],
    ['0x10', 'Use só números, com vírgula para as casas decimais.'],
    ['1e3', 'Use só números, com vírgula para as casas decimais.'],
    ['0', 'Informe um valor maior que 0.'],
    ['0,001', 'Use no máximo 2 casas decimais.'],
    ['1.000.000.000.000', 'O máximo é 999.999.999.999,99.'],
  ])('lê o valor "%s" como se digita no Brasil', (valor, mensagem) => {
    expect(errosDe({ valor }).valor).toBe(mensagem);
  });

  it('a data do crédito vai de 01/01/2000 até hoje', () => {
    expect(errosDe({ data: '2026-10-07' }).data).toBeUndefined();
    expect(errosDe({ data: '2026-10-08' }).data).toBe(
      'O aporte é registrado como recebido: use uma data até hoje.',
    );
    expect(errosDe({ data: '1999-12-31' }).data).toBe('Use uma data a partir de 01/01/2000.');
  });

  it('a competência vai de 01/2000 até um ano depois da corrente, no formato AAAA-MM', () => {
    expect(ultimaCompetencia('2026-10-07')).toBe('2027-10');
    expect(errosDe({ competencia: '2027-10' }).competencia).toBeUndefined();
    expect(errosDe({ competencia: '2027-11' }).competencia).toBe(
      'Use uma competência de 01/2000 até 10/2027.',
    );
    expect(errosDe({ competencia: '0202-09' }).competencia).toBe(
      'Use uma competência de 01/2000 até 10/2027.',
    );
    expect(errosDe({ competencia: '09/2026' }).competencia).toBe(
      'Use o formato AAAA-MM, como 2026-09.',
    );
    expect(errosDe({ competencia: '20266-09' }).competencia).toBe(
      'Use o formato AAAA-MM, como 2026-09.',
    );
    expect(errosDe({ competencia: '2026-13' }).competencia).toBe(
      'Use o formato AAAA-MM, como 2026-09.',
    );
  });
});
