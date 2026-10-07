import type { Erros } from '@/compartilhado/formulario/useValidacao';

import { emailInformado } from './regrasDeAcesso';

/** O nome é o do `SolicitarRecuperacaoRequest`. */
export type CampoDoPedidoDeCodigo = 'email';

export function validarPedidoDeCodigo(
  rascunho: Record<CampoDoPedidoDeCodigo, string>,
): Erros<CampoDoPedidoDeCodigo> {
  return { email: emailInformado(rascunho.email) };
}
