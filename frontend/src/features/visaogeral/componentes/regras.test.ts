import { describe, expect, it } from 'vitest';

import {
  comparativo,
  custoPorHora,
  faixaDeCobertura,
  larguraDaCobertura,
  porAtencao,
  type LinhaDaFrota,
} from './regras';

function linha(parcial: Partial<LinhaDaFrota>): LinhaDaFrota {
  return {
    aeronaveId: 1,
    matricula: 'PS-MEP',
    modelo: 'Citation',
    situacao: 'REGULAR',
    saldo: 0,
    fixos: 0,
    variaveis: 0,
    horas: 0,
    km: 0,
    coberturaEmMeses: undefined,
    avisos: [],
    ...parcial,
  };
}

describe('regras da Visão geral', () => {
  it('a atenção vem pela situação, depois pelo fundo mais curto', () => {
    const vencida = linha({ aeronaveId: 1, situacao: 'VENCIDO', saldo: 100000 });
    const descoberta = linha({ aeronaveId: 2, saldo: -5000 });
    const curta = linha({ aeronaveId: 3, saldo: 1000, coberturaEmMeses: 0.5 });
    const folgada = linha({ aeronaveId: 4, saldo: 90000, coberturaEmMeses: 8 });

    expect([folgada, curta, descoberta, vencida].sort(porAtencao).map((l) => l.aeronaveId)).toEqual(
      [1, 2, 3, 4],
    );
  });

  it('a cobertura pinta crítico abaixo de um mês e enche a barra em seis', () => {
    expect(faixaDeCobertura(0.4)).toBe('critica');
    expect(faixaDeCobertura(2)).toBe('atencao');
    expect(faixaDeCobertura(4)).toBe('folgada');
    expect(faixaDeCobertura(undefined)).toBe('indefinida');
    expect(larguraDaCobertura(3)).toBe(50);
    expect(larguraDaCobertura(12)).toBe(100);
  });

  it('o comparativo ordena, divide a barra em fixo e variável e marca a média', () => {
    const linhas = [
      linha({ aeronaveId: 1, matricula: 'A', fixos: 30, variaveis: 10, horas: 2 }),
      linha({ aeronaveId: 2, matricula: 'B', fixos: 10, variaveis: 10 }),
      linha({ aeronaveId: 3, matricula: 'C' }),
    ];

    const custos = comparativo(
      linhas,
      (l) => l.fixos + l.variaveis,
      (l) => [l.fixos, l.variaveis],
    );

    expect(custos.barras.map((b) => b.rotulo)).toEqual(['A', 'B']);
    expect(custos.barras[0]).toMatchObject({ largura1: 75, largura2: 25 });
    expect(custos.media).toBe(30);
    expect(custos.posicaoDaMedia).toBe(75);
    expect(custoPorHora(linhas[0]!)).toBe(20);
    expect(custoPorHora(linhas[1]!)).toBeUndefined();
  });
});
