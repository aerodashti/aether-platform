import type { Regra } from '@/compartilhado/formulario/regras';

/**
 * O `FormatoDeNome` do servidor: ao menos uma letra ou dígito. Um nome feito só de espaço de
 * largura zero ou de pontuação passa no `obrigatorio` e apareceria em branco na lista.
 */
export function nomeLegivel(): Regra {
  return (texto) =>
    texto.trim() === '' || /[\p{L}\p{N}]/u.test(texto)
      ? undefined
      : 'Use letras ou números, e não só espaços ou sinais.';
}
