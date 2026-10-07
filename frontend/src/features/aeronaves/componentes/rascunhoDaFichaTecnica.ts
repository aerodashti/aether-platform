import { numeroParaCampo } from '@/compartilhado/formatacao/numero';

import type {
  ContadoresRequest,
  DetalheDaAeronaveResponse,
  FichaTecnicaRequest,
} from '../api/useDetalheDaAeronave';

import { numeroOuAusente, numeroValidado, textoOuAusente } from './numerosDoRascunho';

/** Os campos da ficha, com o nome do JSON do request: o `campos` do 400 cai no lugar certo. */
export type CampoDaFicha =
  | 'fabricante'
  | 'modelo'
  | 'numeroDeSerie'
  | 'base'
  | 'hangar'
  | 'apoliceDoSeguro'
  | 'pesoMaxDecolagemKg'
  | 'pesoMaxPousoKg';

export type RascunhoDaFicha = Record<CampoDaFicha, string>;

export const ROTULOS_DA_FICHA: Record<CampoDaFicha, string> = {
  fabricante: 'Fabricante',
  modelo: 'Modelo',
  numeroDeSerie: 'Nº de série',
  base: 'Base (ICAO)',
  hangar: 'Hangar',
  apoliceDoSeguro: 'Apólice do seguro',
  pesoMaxDecolagemKg: 'Peso máx. de decolagem (kg)',
  pesoMaxPousoKg: 'Peso máx. de pouso (kg)',
};

export type CampoDosContadores =
  | 'horasDeCelula'
  | 'ciclos'
  | 'kmVoados'
  | 'horasMotor1'
  | 'horasMotor2'
  | 'horasMotor3'
  | 'horasApu';

export type RascunhoDosContadores = Record<CampoDosContadores, string>;

export const ROTULOS_DOS_CONTADORES: Record<CampoDosContadores, string> = {
  horasDeCelula: 'Horas de célula (h)',
  ciclos: 'Ciclos (pousos)',
  kmVoados: 'Quilômetros voados (km)',
  horasMotor1: 'Motor 1 (h)',
  horasMotor2: 'Motor 2 (h)',
  horasMotor3: 'Motor 3 (h)',
  horasApu: 'APU (h)',
};

export function rascunhoDaFicha(detalhe: DetalheDaAeronaveResponse): RascunhoDaFicha {
  return {
    fabricante: detalhe.fabricante ?? '',
    modelo: detalhe.modelo ?? '',
    numeroDeSerie: detalhe.numeroDeSerie ?? '',
    base: detalhe.base ?? '',
    hangar: detalhe.hangar ?? '',
    apoliceDoSeguro: detalhe.apoliceDoSeguro ?? '',
    pesoMaxDecolagemKg: numeroParaCampo(detalhe.pesoMaxDecolagemKg),
    pesoMaxPousoKg: numeroParaCampo(detalhe.pesoMaxPousoKg),
  };
}

/** A ficha para o PUT. Só depois de `validarFichaTecnica` aprovar o rascunho. */
export function fichaParaEnvio(rascunho: RascunhoDaFicha): FichaTecnicaRequest {
  return {
    fabricante: textoOuAusente(rascunho.fabricante),
    modelo: rascunho.modelo.trim(),
    numeroDeSerie: textoOuAusente(rascunho.numeroDeSerie),
    base: rascunho.base.trim().toUpperCase(),
    hangar: textoOuAusente(rascunho.hangar),
    apoliceDoSeguro: textoOuAusente(rascunho.apoliceDoSeguro),
    pesoMaxDecolagemKg: numeroOuAusente(rascunho.pesoMaxDecolagemKg),
    pesoMaxPousoKg: numeroOuAusente(rascunho.pesoMaxPousoKg),
  };
}

export function rascunhoDosContadores(detalhe: DetalheDaAeronaveResponse): RascunhoDosContadores {
  const contadores = detalhe.contadores;
  return {
    horasDeCelula: numeroParaCampo(contadores?.horasDeCelula),
    ciclos: numeroParaCampo(contadores?.ciclos),
    kmVoados: numeroParaCampo(contadores?.kmVoados),
    horasMotor1: numeroParaCampo(contadores?.horasMotor1),
    horasMotor2: numeroParaCampo(contadores?.horasMotor2),
    horasMotor3: numeroParaCampo(contadores?.horasMotor3),
    horasApu: numeroParaCampo(contadores?.horasApu),
  };
}

/**
 * Se a pessoa mexeu em algum contador. Sem mexer, a correção nem é enviada: reenviar os totais
 * lidos ao abrir apagaria um voo lançado enquanto ela trocava só o hangar.
 */
export function contadoresForamAlterados(
  atuais: RascunhoDosContadores,
  lidos: RascunhoDosContadores,
): boolean {
  return (Object.keys(atuais) as CampoDosContadores[]).some(
    (campo) => atuais[campo].trim() !== lidos[campo].trim(),
  );
}

/**
 * A correção para o PUT, com os totais lidos ao abrir: se um voo os mudou no meio, o servidor
 * recusa em vez de apagá-lo. Só depois de `validarContadores` aprovar o rascunho.
 */
export function contadoresParaEnvio(
  rascunho: RascunhoDosContadores,
  lidos: DetalheDaAeronaveResponse['contadores'],
): ContadoresRequest {
  return {
    horasDeCelula: numeroValidado(rascunho.horasDeCelula),
    ciclos: numeroValidado(rascunho.ciclos),
    kmVoados: numeroValidado(rascunho.kmVoados),
    horasMotor1: numeroOuAusente(rascunho.horasMotor1),
    horasMotor2: numeroOuAusente(rascunho.horasMotor2),
    horasMotor3: numeroOuAusente(rascunho.horasMotor3),
    horasApu: numeroOuAusente(rascunho.horasApu),
    lidos,
  };
}
