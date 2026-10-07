import { lerNumero } from '@/compartilhado/formatacao/numero';

/**
 * Horas × R$/hora, arredondado aos centavos como o servidor arredonda (meio para cima). A conta é
 * feita em inteiros — décimos de hora vezes centavos —, porque em ponto flutuante 2,5 × 14.800,33
 * dá 37.000,824999… e a prévia mostraria um centavo a menos do que a lista vai mostrar.
 *
 * <p>`null` quando um dos dois falta ou não é número: aí não há total a mostrar.
 */
export function totalDaTroca(horas: string, valorPorHora: string): number | null {
  const horasLidas = lerNumero(horas);
  const valorLido = valorPorHora.trim() === '' ? null : lerNumero(valorPorHora);
  if (horasLidas === null || valorLido === null || horasLidas <= 0 || valorLido <= 0) {
    return null;
  }
  const decimosDeHora = BigInt(Math.round(horasLidas * 10));
  const centavos = BigInt(Math.round(valorLido * 100));
  // Décimos × centavos é o total em milésimos de real; +5 e ÷10 arredonda meio para cima.
  const totalEmCentavos = (decimosDeHora * centavos + 5n) / 10n;
  return Number(totalEmCentavos) / 100;
}
