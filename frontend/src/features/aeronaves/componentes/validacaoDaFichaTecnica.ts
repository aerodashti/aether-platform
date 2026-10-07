import { lerNumero } from '@/compartilhado/formatacao/numero';
import {
  numero,
  obrigatorio,
  primeiraFalha,
  tamanhoMaximo,
  type Regra,
} from '@/compartilhado/formulario/regras';
import type { Erros } from '@/compartilhado/formulario/useValidacao';

import type {
  CampoDaFicha,
  CampoDosContadores,
  RascunhoDaFicha,
  RascunhoDosContadores,
} from './rascunhoDaFichaTecnica';

/*
 * Os limites repetem os do servidor (FichaTecnicaRequest, ContadoresRequest) e os das colunas:
 * horas em NUMERIC(10,1), km em NUMERIC(12,1), ciclos em INTEGER. Um muda, o outro muda junto.
 */
const PESO_MAXIMO_KG = 600_000;
const HORAS_MAXIMAS = 999_999_999.9;
const KM_MAXIMOS = 99_999_999_999.9;
const CICLOS_MAXIMOS = 2_147_483_647;

const FORMATO_ICAO = /^[A-Za-z]{4}$/;

const codigoIcao: Regra = (texto) =>
  FORMATO_ICAO.test(texto.trim())
    ? undefined
    : 'A base é um código ICAO de quatro letras, como SBSP.';

const peso = numero({ maiorQue: 0, maximo: PESO_MAXIMO_KG, casas: 0 });

/** O MLW nunca passa do MTOW. Sem um dos dois, não há relação a conferir. */
function ateOPesoDeDecolagem(decolagem: string): Regra {
  return (pouso) => {
    const maximoNaDecolagem = lerNumero(decolagem);
    const maximoNoPouso = lerNumero(pouso);
    return maximoNaDecolagem !== null && maximoNoPouso !== null && maximoNoPouso > maximoNaDecolagem
      ? 'O peso máximo de pouso não pode passar do peso máximo de decolagem.'
      : undefined;
  };
}

export function validarFichaTecnica(rascunho: RascunhoDaFicha): Erros<CampoDaFicha> {
  return {
    fabricante: primeiraFalha(rascunho.fabricante, tamanhoMaximo(80)),
    modelo: primeiraFalha(rascunho.modelo, obrigatorio('Informe o modelo.'), tamanhoMaximo(120)),
    numeroDeSerie: primeiraFalha(rascunho.numeroDeSerie, tamanhoMaximo(40)),
    base: primeiraFalha(rascunho.base, obrigatorio('Informe a base.'), codigoIcao),
    hangar: primeiraFalha(rascunho.hangar, tamanhoMaximo(60)),
    apoliceDoSeguro: primeiraFalha(rascunho.apoliceDoSeguro, tamanhoMaximo(40)),
    pesoMaxDecolagemKg: primeiraFalha(rascunho.pesoMaxDecolagemKg, peso),
    pesoMaxPousoKg: primeiraFalha(
      rascunho.pesoMaxPousoKg,
      peso,
      ateOPesoDeDecolagem(rascunho.pesoMaxDecolagemKg),
    ),
  };
}

/** "1234:30" não é 1234,5 h: quem digita no formato do relógio precisa saber o que mudar. */
const horasDecimais: Regra = (texto) =>
  texto.includes(':') ? 'Use horas decimais, como 1234,5 — não 1234:30.' : undefined;

const horas = [horasDecimais, numero({ minimo: 0, maximo: HORAS_MAXIMAS, casas: 1 })];

export function validarContadores(rascunho: RascunhoDosContadores): Erros<CampoDosContadores> {
  return {
    horasDeCelula: primeiraFalha(
      rascunho.horasDeCelula,
      obrigatorio('Informe as horas de célula.'),
      ...horas,
    ),
    ciclos: primeiraFalha(
      rascunho.ciclos,
      obrigatorio('Informe os ciclos.'),
      numero({ minimo: 0, maximo: CICLOS_MAXIMOS, casas: 0 }),
    ),
    kmVoados: primeiraFalha(
      rascunho.kmVoados,
      obrigatorio('Informe os quilômetros voados.'),
      numero({ minimo: 0, maximo: KM_MAXIMOS, casas: 1 }),
    ),
    horasMotor1: primeiraFalha(rascunho.horasMotor1, ...horas),
    horasMotor2: primeiraFalha(rascunho.horasMotor2, ...horas),
    horasMotor3: primeiraFalha(rascunho.horasMotor3, ...horas),
    horasApu: primeiraFalha(rascunho.horasApu, ...horas),
  };
}
