import { obrigatorio, primeiraFalha, type Regra } from '@/compartilhado/formulario/regras';
import type { Erros } from '@/compartilhado/formulario/useValidacao';

/** Os três primeiros são os campos de `TrocarSenhaRequest`; a confirmação só existe na tela. */
export type CampoDaTroca = 'senhaAtual' | 'novaSenha' | 'confirmacao' | 'codigo';

export type RascunhoDaTroca = Record<CampoDaTroca, string>;

export const ROTULOS_DA_TROCA: Record<CampoDaTroca, string> = {
  senhaAtual: 'Senha atual',
  novaSenha: 'Nova senha',
  confirmacao: 'Confirmar nova senha',
  codigo: 'Código de confirmação',
};

const MINIMO_DA_SENHA = 8;
const MAXIMO_DA_SENHA = 72;

/** O `@Size` do servidor conta caracteres sem tirar espaços: o espaço da ponta é parte da senha. */
const tamanhoDaSenha: Regra = (texto) =>
  texto.length < MINIMO_DA_SENHA || texto.length > MAXIMO_DA_SENHA
    ? `A senha deve ter entre ${MINIMO_DA_SENHA} e ${MAXIMO_DA_SENHA} caracteres.`
    : undefined;

/** O `@CabeNoBcrypt` do servidor: o BCrypt mede bytes, e "ç" ocupa dois. */
const cabeNoBcrypt: Regra = (texto) =>
  new TextEncoder().encode(texto).length > MAXIMO_DA_SENHA
    ? 'A senha passa do limite: letras com acento e emojis contam como mais de um caractere.'
    : undefined;

/** O código colado do e-mail costuma vir com espaço nas pontas; ele sai antes do envio. */
const codigoDeSeisDigitos: Regra = (texto) =>
  /^\d{6}$/.test(texto.trim()) ? undefined : 'O código tem seis dígitos.';

function diferenteDaAtual(senhaAtual: string): Regra {
  return (texto) =>
    texto === senhaAtual ? 'A nova senha precisa ser diferente da atual.' : undefined;
}

function igualANova(novaSenha: string): Regra {
  return (texto) => (texto === novaSenha ? undefined : 'As duas senhas não conferem.');
}

export function validarTrocaDeSenha(rascunho: RascunhoDaTroca): Erros<CampoDaTroca> {
  return {
    senhaAtual: primeiraFalha(rascunho.senhaAtual, obrigatorio('Informe a senha atual.')),
    novaSenha: primeiraFalha(
      rascunho.novaSenha,
      obrigatorio('Informe a nova senha.'),
      tamanhoDaSenha,
      cabeNoBcrypt,
      diferenteDaAtual(rascunho.senhaAtual),
    ),
    confirmacao: primeiraFalha(
      rascunho.confirmacao,
      obrigatorio('Repita a nova senha.'),
      igualANova(rascunho.novaSenha),
    ),
    codigo: primeiraFalha(
      rascunho.codigo,
      obrigatorio('Informe o código enviado por e-mail.'),
      codigoDeSeisDigitos,
    ),
  };
}
