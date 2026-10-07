import type { Erros } from '@/compartilhado/formulario/useValidacao';

import { codigoDeSeisDigitos } from './regrasDeAcesso';

/** O nome é o do `ValidarCodigoRequest`; o e-mail vem do passo anterior e não é editado aqui. */
export type CampoDoCodigo = 'codigo';

export function validarCodigo(rascunho: Record<CampoDoCodigo, string>): Erros<CampoDoCodigo> {
  return { codigo: codigoDeSeisDigitos(rascunho.codigo) };
}
