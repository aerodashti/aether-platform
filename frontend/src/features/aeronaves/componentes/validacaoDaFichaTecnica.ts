import { obrigatorio, primeiraFalha, tamanhoMaximo } from '@/compartilhado/formulario/regras';
import type { Erros } from '@/compartilhado/formulario/useValidacao';

import type {
  CampoDaFicha,
  CampoDosContadores,
  RascunhoDaFicha,
  RascunhoDosContadores,
} from './rascunhoDaFichaTecnica';
import {
  ateOPesoDeDecolagem,
  CICLOS,
  CODIGO_ICAO,
  HORAS,
  PESO,
  QUILOMETROS,
} from './regrasDaAeronave';

export function validarFichaTecnica(rascunho: RascunhoDaFicha): Erros<CampoDaFicha> {
  return {
    fabricante: primeiraFalha(rascunho.fabricante, tamanhoMaximo(80)),
    modelo: primeiraFalha(rascunho.modelo, obrigatorio('Informe o modelo.'), tamanhoMaximo(120)),
    numeroDeSerie: primeiraFalha(rascunho.numeroDeSerie, tamanhoMaximo(40)),
    base: primeiraFalha(rascunho.base, obrigatorio('Informe a base.'), CODIGO_ICAO),
    hangar: primeiraFalha(rascunho.hangar, tamanhoMaximo(60)),
    apoliceDoSeguro: primeiraFalha(rascunho.apoliceDoSeguro, tamanhoMaximo(40)),
    pesoMaxDecolagemKg: primeiraFalha(rascunho.pesoMaxDecolagemKg, PESO),
    pesoMaxPousoKg: primeiraFalha(
      rascunho.pesoMaxPousoKg,
      PESO,
      ateOPesoDeDecolagem(rascunho.pesoMaxDecolagemKg),
    ),
  };
}

export function validarContadores(rascunho: RascunhoDosContadores): Erros<CampoDosContadores> {
  return {
    horasDeCelula: primeiraFalha(
      rascunho.horasDeCelula,
      obrigatorio('Informe as horas de célula.'),
      ...HORAS,
    ),
    ciclos: primeiraFalha(rascunho.ciclos, obrigatorio('Informe os ciclos.'), CICLOS),
    kmVoados: primeiraFalha(
      rascunho.kmVoados,
      obrigatorio('Informe os quilômetros voados.'),
      QUILOMETROS,
    ),
    horasMotor1: primeiraFalha(rascunho.horasMotor1, ...HORAS),
    horasMotor2: primeiraFalha(rascunho.horasMotor2, ...HORAS),
    horasMotor3: primeiraFalha(rascunho.horasMotor3, ...HORAS),
    horasApu: primeiraFalha(rascunho.horasApu, ...HORAS),
  };
}
