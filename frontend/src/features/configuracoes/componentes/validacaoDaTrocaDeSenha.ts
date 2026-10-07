import {
  obrigatorio,
  primeiraFalha,
  senhaNova,
  type Regra,
} from '@/compartilhado/formulario/regras';
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
      senhaNova(),
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
