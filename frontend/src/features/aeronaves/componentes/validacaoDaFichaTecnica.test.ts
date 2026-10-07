import { describe, expect, it } from 'vitest';

import type { RascunhoDaFicha, RascunhoDosContadores } from './rascunhoDaFichaTecnica';
import { validarContadores, validarFichaTecnica } from './validacaoDaFichaTecnica';

const FICHA: RascunhoDaFicha = {
  fabricante: 'Pilatus',
  modelo: 'PC-12 NGX',
  numeroDeSerie: '',
  base: 'SBPS',
  hangar: '',
  apoliceDoSeguro: '',
  pesoMaxDecolagemKg: '5.670',
  pesoMaxPousoKg: '5.340',
};

const CONTADORES: RascunhoDosContadores = {
  horasDeCelula: '3412,5',
  ciclos: '2890',
  kmVoados: '1.482.300',
  horasMotor1: '3390,2',
  horasMotor2: '',
  horasMotor3: '',
  horasApu: '',
};

function ficha(mudancas: Partial<RascunhoDaFicha>) {
  return validarFichaTecnica({ ...FICHA, ...mudancas });
}

function contadores(mudancas: Partial<RascunhoDosContadores>) {
  return validarContadores({ ...CONTADORES, ...mudancas });
}

describe('validarFichaTecnica', () => {
  it('aceita a ficha no formato brasileiro, com o ponto de milhar no peso', () => {
    expect(Object.values(validarFichaTecnica(FICHA)).filter(Boolean)).toEqual([]);
  });

  it('exige modelo e base, e a base são quatro letras', () => {
    expect(ficha({ modelo: '  ' }).modelo).toBe('Informe o modelo.');
    expect(ficha({ base: '' }).base).toBe('Informe a base.');
    expect(ficha({ base: 'SB1P' }).base).toBe(
      'A base é um código ICAO de quatro letras, como SBSP.',
    );
    expect(ficha({ base: 'SBSPX' }).base).toBeDefined();
  });

  it('diz o limite de cada texto em vez de cortá-lo', () => {
    expect(ficha({ modelo: 'x'.repeat(121) }).modelo).toBe('Use no máximo 120 caracteres.');
    expect(ficha({ hangar: 'x'.repeat(61) }).hangar).toBe('Use no máximo 60 caracteres.');
  });

  it('peso é inteiro: decimal ou texto são recusados, nunca truncados', () => {
    expect(ficha({ pesoMaxDecolagemKg: '5,67' }).pesoMaxDecolagemKg).toBe('Use um número inteiro.');
    expect(ficha({ pesoMaxDecolagemKg: '5.67' }).pesoMaxDecolagemKg).toBe('Use um número inteiro.');
    expect(ficha({ pesoMaxDecolagemKg: 'abc' }).pesoMaxDecolagemKg).toBe(
      'Use só números inteiros.',
    );
  });

  it('peso vai de 1 a 600.000 kg', () => {
    expect(ficha({ pesoMaxDecolagemKg: '0' }).pesoMaxDecolagemKg).toBe(
      'Informe um valor maior que 0.',
    );
    expect(ficha({ pesoMaxDecolagemKg: '600.001' }).pesoMaxDecolagemKg).toBe('O máximo é 600.000.');
  });

  it('o peso de pouso não passa do de decolagem; sem um deles não há relação', () => {
    expect(ficha({ pesoMaxPousoKg: '9.999' }).pesoMaxPousoKg).toBe(
      'O peso máximo de pouso não pode passar do peso máximo de decolagem.',
    );
    expect(ficha({ pesoMaxPousoKg: '5.670' }).pesoMaxPousoKg).toBeUndefined();
    expect(
      ficha({ pesoMaxDecolagemKg: '', pesoMaxPousoKg: '9.999' }).pesoMaxPousoKg,
    ).toBeUndefined();
  });
});

describe('validarContadores', () => {
  it('aceita horas com uma casa e km com milhar', () => {
    expect(Object.values(validarContadores(CONTADORES)).filter(Boolean)).toEqual([]);
  });

  it('célula, ciclos e km vazios são falta — não viram zero', () => {
    const erros = contadores({ horasDeCelula: '', ciclos: ' ', kmVoados: '' });

    expect(erros.horasDeCelula).toBe('Informe as horas de célula.');
    expect(erros.ciclos).toBe('Informe os ciclos.');
    expect(erros.kmVoados).toBe('Informe os quilômetros voados.');
  });

  it('motor e APU vazios são "não tem"; texto ilegível é erro, não apaga o valor', () => {
    expect(contadores({ horasMotor2: '' }).horasMotor2).toBeUndefined();
    expect(contadores({ horasApu: 'abc' }).horasApu).toBe(
      'Use só números, com vírgula para as casas decimais.',
    );
  });

  it('hh:mm recebe a instrução das horas decimais', () => {
    expect(contadores({ horasDeCelula: '1234:30' }).horasDeCelula).toBe(
      'Use horas decimais, como 1234,5 — não 1234:30.',
    );
    expect(contadores({ horasMotor1: '12:00' }).horasMotor1).toBeDefined();
  });

  it('respeita a escala e o tamanho das colunas', () => {
    expect(contadores({ horasDeCelula: '1234,56' }).horasDeCelula).toBe(
      'Use no máximo 1 casa decimal.',
    );
    expect(contadores({ ciclos: '12,5' }).ciclos).toBe('Use um número inteiro.');
    expect(contadores({ horasDeCelula: '1.000.000.000' }).horasDeCelula).toBe(
      'O máximo é 999.999.999,9.',
    );
    expect(contadores({ kmVoados: '100.000.000.000' }).kmVoados).toBe(
      'O máximo é 99.999.999.999,9.',
    );
    expect(contadores({ horasMotor3: '-1' }).horasMotor3).toBe('O mínimo é 0.');
  });
});
