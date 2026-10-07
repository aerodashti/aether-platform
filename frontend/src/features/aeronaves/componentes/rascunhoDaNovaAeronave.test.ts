import { describe, expect, it } from 'vitest';

import {
  comVinculo,
  foiAlterado,
  paraCadastro,
  paraContrato,
  RASCUNHO_INICIAL,
  type RascunhoDaNovaAeronave,
} from './rascunhoDaNovaAeronave';

const PREENCHIDO: RascunhoDaNovaAeronave = {
  ...RASCUNHO_INICIAL,
  matricula: ' ps-aer ',
  fabricante: '   ',
  modelo: '  Phenom 300E  ',
  base: 'sbjd',
  hangar: 'Hangar 2',
  vencimentoReta: '2027-08-01',
  vencimentoCva: '2027-06-01',
  pesoMaxDecolagemKg: '8.150',
  horasDeCelula: '3.500',
  ciclos: '2.890',
  kmVoados: '1.482.300,5',
  quantidadeDeMotores: '1',
  horasMotor1: '0',
  horasMotor2: '1180',
  valorDoAporte: '1.500,00',
  saldoDeAbertura: '-12.500,00',
};

describe('paraCadastro', () => {
  it('apara e põe em maiúsculas a identidade; opcional vazio vai ausente', () => {
    const cadastro = paraCadastro(PREENCHIDO);

    expect(cadastro.matricula).toBe('PS-AER');
    expect(cadastro.base).toBe('SBJD');
    expect(cadastro.modelo).toBe('Phenom 300E');
    expect(cadastro.fabricante).toBeUndefined();
    expect(cadastro.numeroDeSerie).toBeUndefined();
    expect(cadastro.hangar).toBe('Hangar 2');
    expect(cadastro.pesoMaxPousoKg).toBeUndefined();
  });

  it('lê os números como se digita no Brasil — e nunca manda NaN', () => {
    const cadastro = paraCadastro(PREENCHIDO);

    expect(cadastro.pesoMaxDecolagemKg).toBe(8150);
    expect(cadastro.contadores).toEqual({
      horasDeCelula: 3500,
      ciclos: 2890,
      kmVoados: 1482300.5,
      horasMotor1: 0,
      horasMotor2: undefined,
      horasMotor3: undefined,
      horasApu: undefined,
    });
    expect(cadastro.configuracaoFinanceira.valorDoAporte).toBe(1500);
    expect(cadastro.configuracaoFinanceira.saldoDeAbertura).toBe(-12500);
    expect(JSON.stringify(cadastro)).not.toContain('null');
  });

  it('no aporte proporcional, o valor não vai', () => {
    const cadastro = paraCadastro({ ...PREENCHIDO, modeloDeAporte: 'PROPORCIONAL_AO_USO' });

    expect(cadastro.configuracaoFinanceira.valorDoAporte).toBeUndefined();
  });
});

describe('paraContrato', () => {
  it('leva cada participação com vírgula como número', () => {
    const percentuais = ['66,67', '33,33'];
    const vinculos = comVinculo(comVinculo([], { id: 1, nome: 'Ricardo' }), {
      id: 2,
      nome: 'Vetor',
    }).map((vinculo, indice) => ({ ...vinculo, percentual: percentuais[indice] ?? '' }));

    expect(paraContrato({ ...PREENCHIDO, vinculos })).toEqual({
      participacoes: [
        { proprietarioId: 1, percentual: 66.67 },
        { proprietarioId: 2, percentual: 33.33 },
      ],
    });
  });
});

describe('foiAlterado', () => {
  it('só há o que perder depois de mexer em algum campo', () => {
    expect(foiAlterado(RASCUNHO_INICIAL)).toBe(false);
    expect(foiAlterado({ ...RASCUNHO_INICIAL, modelo: 'P' })).toBe(true);
  });
});
