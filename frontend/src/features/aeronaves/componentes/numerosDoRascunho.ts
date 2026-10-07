import { lerNumero } from '@/compartilhado/formatacao/numero';

/*
 * Do rascunho (texto de campo) ao corpo do request, igual no cadastro e nas edições do detalhe.
 * Só depois de a validação aprovar o rascunho.
 */

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

/** Opcional em branco é "não informado": vai ausente, e o servidor grava nulo. */
export function textoOuAusente(texto: string): string | undefined {
  return texto.trim() || undefined;
}
