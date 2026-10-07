import { lerNumero } from '@/compartilhado/formatacao/numero';

/**
 * O número de um campo obrigatório que a validação já aprovou. Chamar antes de validar é erro de
 * programação, e lança: mandar `NaN` (que vira `null` no JSON) ou zero apagaria o valor salvo.
 */
export function numeroValidado(texto: string): number {
  const valor = lerNumero(texto);
  if (valor === null) {
    throw new Error(`O campo não traz um número: "${texto}". Valide o rascunho antes de enviar.`);
  }
  return valor;
}

/** O número de um campo opcional já validado: vazio é ausente (nulo no servidor), nunca zero. */
export function numeroOuAusente(texto: string): number | undefined {
  return lerNumero(texto) ?? undefined;
}
