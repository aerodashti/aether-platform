import {
  email,
  MAXIMO_DA_SENHA_NOVA_EM_BYTES,
  MINIMO_DA_SENHA_NOVA,
  obrigatorio,
  primeiraFalha,
  senhaNova as limitesDaSenhaNova,
  type Regra,
} from '@/compartilhado/formulario/regras';

/**
 * As regras dos campos da área não logada, espelhando os requests de `/autenticacao`. Um limite
 * que muda aqui muda também no backend (`EntrarRequest`, `@SenhaNova`, `ValidarCodigoRequest`).
 */

/** O teto do login: nenhuma senha gravada passa dele. Conta como o `@Size` do backend conta. */
const MAXIMO_DA_SENHA_DO_LOGIN = 72;
const TAMANHO_DO_CODIGO = 6;

export const APOIO_DA_SENHA_NOVA = `Entre ${MINIMO_DA_SENHA_NOVA} e ${MAXIMO_DA_SENHA_NOVA_EM_BYTES} caracteres.`;

const limiteDaSenhaDoLogin: Regra = (texto) =>
  texto.length > MAXIMO_DA_SENHA_DO_LOGIN
    ? `A senha tem no máximo ${MAXIMO_DA_SENHA_DO_LOGIN} caracteres.`
    : undefined;

const formatoDoCodigo: Regra = (texto) =>
  new RegExp(`^\\d{${TAMANHO_DO_CODIGO}}$`).test(texto.trim())
    ? undefined
    : 'O código tem seis dígitos.';

export function emailInformado(texto: string): string | undefined {
  return primeiraFalha(texto, obrigatorio('Informe o e-mail.'), email());
}

/** Só espaços conta como vazio: o servidor recusa os dois com a mesma frase. */
export function senhaDoLogin(texto: string): string | undefined {
  return primeiraFalha(texto, obrigatorio('Informe a senha.'), limiteDaSenhaDoLogin);
}

export function senhaNova(texto: string): string | undefined {
  return primeiraFalha(texto, obrigatorio('Informe a nova senha.'), limitesDaSenhaNova());
}

export function codigoDeSeisDigitos(texto: string): string | undefined {
  return primeiraFalha(texto, obrigatorio('Informe o código.'), formatoDoCodigo);
}

/**
 * Só os dígitos, e só os seis primeiros. O corte vem depois do filtro: colar "519 274" do e-mail
 * tem sete caracteres, e cortar antes perderia o último dígito.
 */
export function digitosDoCodigo(texto: string): string {
  return texto.replace(/\D/g, '').slice(0, TAMANHO_DO_CODIGO);
}
