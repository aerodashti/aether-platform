import type { Erros } from '@/compartilhado/formulario/useValidacao';

import { emailInformado, senhaDoLogin } from './regrasDeAcesso';

/** Os nomes são os do `EntrarRequest`, para o `campos` do 400 cair no campo certo. */
export type CampoDaEntrada = 'email' | 'senha';

export function validarEntrada(rascunho: Record<CampoDaEntrada, string>): Erros<CampoDaEntrada> {
  return { email: emailInformado(rascunho.email), senha: senhaDoLogin(rascunho.senha) };
}
