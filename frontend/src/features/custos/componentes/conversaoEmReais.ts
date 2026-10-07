import { lerNumero } from '@/compartilhado/formatacao/numero';

const CASAS_DO_VALOR = 100;
const CASAS_DO_CAMBIO = 10_000;
/** Metade de um centavo, na unidade do produto (centavo × décimo de milésimo). */
const MEIO_CENTAVO = 5_000n;

/**
 * O BRL de um lançamento em USD, em centavos, como o servidor o grava: valor × câmbio com duas
 * casas, arredondado para cima a partir da metade (`HALF_UP`).
 *
 * <p>A conta é feita em inteiros: no teto da coluna, valor × câmbio passa de 2^53 e o `number`
 * perderia os centavos — a prévia mostraria um valor e o servidor gravaria outro. `null` quando um
 * dos dois não é um número positivo.
 */
export function centavosEmReais(valor: string, cambio: string): bigint | null {
  const original = lerNumero(valor);
  const taxa = lerNumero(cambio);
  if (original === null || taxa === null || original <= 0 || taxa <= 0) {
    return null;
  }
  const centavos = BigInt(Math.round(original * CASAS_DO_VALOR));
  const decimosDeMilesimo = BigInt(Math.round(taxa * CASAS_DO_CAMBIO));
  return (centavos * decimosDeMilesimo + MEIO_CENTAVO) / BigInt(CASAS_DO_CAMBIO);
}

/** A prévia da conversão, em reais. */
export function emReais(valor: string, cambio: string): number | null {
  const centavos = centavosEmReais(valor, cambio);
  return centavos === null ? null : Number(centavos) / CASAS_DO_VALOR;
}
