import { lerNumero } from '@/compartilhado/formatacao/numero';
import { numero, type Regra } from '@/compartilhado/formulario/regras';

/*
 * As regras de aeronave que o cadastro e as edições do detalhe aplicam igual. Os limites repetem
 * os do servidor (CriarAeronaveRequest, FichaTecnicaRequest, ContadoresRequest,
 * ConfiguracaoFinanceiraRequest) e os das colunas: horas em NUMERIC(10,1), km em NUMERIC(12,1),
 * ciclos em INTEGER e reais em NUMERIC(14,2). Um muda, o outro muda junto.
 */

/** O teto de plausibilidade do produto, o mesmo `FichaTecnica.PESO_MAXIMO_KG` do servidor. */
export const PESO_MAXIMO_KG = 600_000;
export const HORAS_MAXIMAS = 999_999_999.9;
export const KM_MAXIMOS = 99_999_999_999.9;
const CICLOS_MAXIMOS = 2_147_483_647;
const REAIS_MAXIMOS = 999_999_999_999.99;

function formato(expressao: RegExp, mensagem: string): Regra {
  return (texto) => (texto.trim() === '' || expressao.test(texto.trim()) ? undefined : mensagem);
}

export const MATRICULA = formato(/^P[PRSTU]-[A-Z]{3}$/i, 'Use o padrão do RAB: PS-MEP.');

export const CODIGO_ICAO = formato(
  /^[A-Z]{4}$/i,
  'A base é um código ICAO de quatro letras, como SBSP.',
);

export const PESO = numero({ maiorQue: 0, maximo: PESO_MAXIMO_KG, casas: 0 });

/** O MLW nunca passa do MTOW. Sem um dos dois, não há relação a conferir. */
export function ateOPesoDeDecolagem(decolagem: string): Regra {
  return (pouso) => {
    const maximoNaDecolagem = lerNumero(decolagem);
    const maximoNoPouso = lerNumero(pouso);
    return maximoNaDecolagem !== null && maximoNoPouso !== null && maximoNoPouso > maximoNaDecolagem
      ? 'O peso máximo de pouso não pode passar do peso máximo de decolagem.'
      : undefined;
  };
}

/** "1234:30" não é 1234,5 h: quem digita no formato do relógio precisa saber o que mudar. */
const horasDecimais: Regra = (texto) =>
  texto.includes(':') ? 'Use horas decimais, como 1234,5 — não 1234:30.' : undefined;

/** Horas de célula, de motor e de APU. */
export const HORAS: Regra[] = [
  horasDecimais,
  numero({ minimo: 0, maximo: HORAS_MAXIMAS, casas: 1 }),
];

export const QUILOMETROS = numero({ minimo: 0, maximo: KM_MAXIMOS, casas: 1 });

export const CICLOS = numero({ minimo: 0, maximo: CICLOS_MAXIMOS, casas: 0 });

/** O valor de cada aporte, só no aporte fixo: sem ele, não há o que cobrar. */
export const VALOR_DO_APORTE = numero({ maiorQue: 0, maximo: REAIS_MAXIMOS, casas: 2 });

/** O saldo do fundo, negativo quando os proprietários devem. */
export const SALDO = numero({ minimo: -REAIS_MAXIMOS, maximo: REAIS_MAXIMOS, casas: 2 });

export const DIA_DE_FECHAMENTO = numero({ minimo: 1, maximo: 28, casas: 0 });
