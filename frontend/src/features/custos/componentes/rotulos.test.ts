import { describe, expect, it } from 'vitest';

import type { CustoResponse } from '../api/useCustos';

import { csvDosLancamentos } from './rotulos';

const LANCAMENTO: CustoResponse = {
  id: 5,
  tipo: 'VARIAVEL',
  categoria: 'ABASTECIMENTO',
  data: '2026-09-08',
  descricao: 'Jet A-1 "SBRJ"',
  relatorioDeVoo: 'RV;1',
  rateado: true,
  notaFiscal: 'NF 1;2',
  moeda: 'BRL',
  valor: 15725.5,
};

describe('csvDosLancamentos', () => {
  it('um ";" numa nota ou no voo não desloca as colunas', () => {
    const [, linha] = csvDosLancamentos([LANCAMENTO]).split('\n');

    expect(linha).toBe(
      '"Jet A-1 ""SBRJ""";"2026-09-08";"RV;1";"Variável";"Abastecimento";' +
        '"Rateio entre os proprietários";"NF 1;2";"BRL";"15725,5"',
    );
  });

  it('o texto que começaria uma fórmula vai com apóstrofo à frente', () => {
    const [, linha] = csvDosLancamentos([
      { ...LANCAMENTO, descricao: '=HYPERLINK("x")', notaFiscal: '+55', relatorioDeVoo: '@A1' },
    ]).split('\n');

    expect(linha).toContain('"\'=HYPERLINK(""x"")"');
    expect(linha).toContain('"\'+55"');
    expect(linha).toContain('"\'@A1"');
  });
});
