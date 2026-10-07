import { obrigatorio, primeiraFalha } from '@/compartilhado/formulario/regras';
import type { Erros } from '@/compartilhado/formulario/useValidacao';

import { senhaNova } from './regrasDeAcesso';

/**
 * A senha escolhida na recuperação e no convite. `novaSenha` é o nome nos dois requests; a
 * confirmação existe só na tela.
 */
export type CampoDaSenhaNova = 'novaSenha' | 'confirmacao';

/** As duas mensagens são independentes: a confirmação é conferida mesmo com a senha fora da regra. */
export function validarSenhaNova(
  rascunho: Record<CampoDaSenhaNova, string>,
): Erros<CampoDaSenhaNova> {
  return {
    novaSenha: senhaNova(rascunho.novaSenha),
    confirmacao: primeiraFalha(
      rascunho.confirmacao,
      obrigatorio('Repita a nova senha.'),
      (confirmacao) =>
        confirmacao === rascunho.novaSenha
          ? undefined
          : 'A confirmação não confere com a nova senha.',
    ),
  };
}
