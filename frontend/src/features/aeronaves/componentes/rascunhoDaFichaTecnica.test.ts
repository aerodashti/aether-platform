import { describe, expect, it } from 'vitest';

import type { DetalheDaAeronaveResponse } from '../api/useDetalheDaAeronave';

import { numeroValidado } from './numerosDoRascunho';
import {
  contadoresForamAlterados,
  contadoresParaEnvio,
  fichaParaEnvio,
  rascunhoDaFicha,
  rascunhoDosContadores,
} from './rascunhoDaFichaTecnica';

/** Como a API serializa o ausente: `null`, não `undefined`. */
const PP_JHF = {
  id: 4,
  matricula: 'PP-JHF',
  fabricante: null,
  modelo: 'Pilatus PC-12 NGX',
  base: 'SBPS',
  pesoMaxDecolagemKg: null,
  pesoMaxPousoKg: 5340,
  contadores: {
    horasDeCelula: 3412.5,
    ciclos: 2890,
    kmVoados: 1482300,
    horasMotor1: 3390.2,
    horasMotor2: null,
    horasMotor3: null,
    horasApu: null,
  },
} as unknown as DetalheDaAeronaveResponse;

describe('rascunho da ficha técnica', () => {
  it('o ausente abre vazio, nunca com o texto "null", e o decimal com vírgula', () => {
    const ficha = rascunhoDaFicha(PP_JHF);
    const contadores = rascunhoDosContadores(PP_JHF);

    expect(ficha.fabricante).toBe('');
    expect(ficha.pesoMaxDecolagemKg).toBe('');
    expect(ficha.pesoMaxPousoKg).toBe('5340');
    expect(contadores.horasDeCelula).toBe('3412,5');
    expect(contadores.horasMotor2).toBe('');
  });

  it('envia o texto aparado, o opcional em branco ausente e o peso com milhar inteiro', () => {
    const envio = fichaParaEnvio({
      ...rascunhoDaFicha(PP_JHF),
      modelo: '  Pilatus PC-12 NGX ',
      base: ' sbps',
      hangar: '   ',
      pesoMaxDecolagemKg: '5.670',
    });

    expect(envio).toEqual({
      modelo: 'Pilatus PC-12 NGX',
      base: 'SBPS',
      pesoMaxDecolagemKg: 5670,
      pesoMaxPousoKg: 5340,
    });
  });

  it('só há correção de contadores quando alguém mexeu neles', () => {
    const lidos = rascunhoDosContadores(PP_JHF);

    expect(contadoresForamAlterados({ ...lidos }, lidos)).toBe(false);
    expect(contadoresForamAlterados({ ...lidos, horasApu: '12' }, lidos)).toBe(true);
  });

  it('a correção leva os números lidos no formato brasileiro e os totais da leitura', () => {
    const envio = contadoresParaEnvio(
      { ...rascunhoDosContadores(PP_JHF), horasDeCelula: '3.500,5', kmVoados: '1.500.000' },
      PP_JHF.contadores,
    );

    expect(envio.horasDeCelula).toBe(3500.5);
    expect(envio.kmVoados).toBe(1500000);
    expect(envio.horasMotor2).toBeUndefined();
    expect(envio.lidos).toBe(PP_JHF.contadores);
  });

  it('número obrigatório sem validação prévia é erro de programação, não NaN nem zero', () => {
    expect(() => numeroValidado('')).toThrow();
    expect(() => numeroValidado('1234:30')).toThrow();
  });
});
