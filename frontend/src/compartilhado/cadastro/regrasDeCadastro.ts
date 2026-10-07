import { email, type Regra } from '@/compartilhado/formulario/regras';

const MENSAGEM_DE_EMAIL = 'Informe um e-mail completo, como nome@empresa.com.br.';

/** O `FormatoDeEmail.EXPRESSAO` do servidor: domínio com ponto e sufixo de duas letras ou mais. */
const DOMINIO_COMPLETO = /@[^@]+\.[^@.]{2,}$/;

/**
 * O e-mail que alguém consegue receber, como o servidor exige no convite e na empresa: o formato
 * do `email()` comum e, além dele, o domínio completo — "fulano@empresa" passa no `email()` e é
 * recusado pelo servidor. Vazio passa: some com `obrigatorio`.
 */
export function emailCompleto(): Regra {
  const formato = email(MENSAGEM_DE_EMAIL);
  return (texto) => {
    const limpo = texto.trim();
    if (limpo === '') {
      return undefined;
    }
    return formato(limpo) ?? (DOMINIO_COMPLETO.test(limpo) ? undefined : MENSAGEM_DE_EMAIL);
  };
}

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
