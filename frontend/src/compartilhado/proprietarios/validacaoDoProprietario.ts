import {
  email,
  obrigatorio,
  primeiraFalha,
  tamanhoMaximo,
  telefone,
  type Regra,
} from '@/compartilhado/formulario/regras';
import type { Erros } from '@/compartilhado/formulario/useValidacao';
import type { CorDeIdentificacao } from '@/design-system/primitivos/SeletorDeCor';

import { MENSAGEM_DE_DOCUMENTO_INVALIDO, cpfCnpjEhValido, normalizarCpfCnpj } from './cpfCnpj';

/** O cadastro como está na tela; os nomes são os do JSON do request. */
export interface RascunhoDoProprietario {
  nome: string;
  cpfCnpj: string;
  email: string;
  telefone: string;
  corDeIdentificacao: CorDeIdentificacao;
}

export type CampoDoProprietario = keyof RascunhoDoProprietario;

export const ROTULOS_DO_PROPRIETARIO: Record<CampoDoProprietario, string> = {
  nome: 'Nome / Nome fantasia',
  cpfCnpj: 'CPF / CNPJ',
  email: 'E-mail',
  telefone: 'Telefone',
  corDeIdentificacao: 'Cor de identificação',
};

function estaEmBranco(texto: string): boolean {
  return texto.trim() === '';
}

/** Um nome feito só de espaço de largura zero passa pelo `trim` e seria um nome em branco. */
const possuiLetraOuNumero: Regra = (texto) =>
  /[\p{L}\p{N}]/u.test(texto) ? undefined : 'O nome precisa ter ao menos uma letra ou um número.';

/** Só o campo em branco é "sem documento"; qualquer outra coisa precisa ser CPF ou CNPJ. */
const documentoValido: Regra = (texto) =>
  estaEmBranco(texto) || cpfCnpjEhValido(normalizarCpfCnpj(texto))
    ? undefined
    : MENSAGEM_DE_DOCUMENTO_INVALIDO;

/** Os limites de `ProprietarioRequest.java` e das colunas de `proprietario`. */
export function validarProprietario(rascunho: RascunhoDoProprietario): Erros<CampoDoProprietario> {
  return {
    nome: primeiraFalha(
      rascunho.nome,
      obrigatorio('Informe o nome do proprietário.'),
      possuiLetraOuNumero,
      tamanhoMaximo(120),
    ),
    cpfCnpj: primeiraFalha(rascunho.cpfCnpj, tamanhoMaximo(20), documentoValido),
    email: primeiraFalha(rascunho.email, tamanhoMaximo(180), email()),
    telefone: primeiraFalha(rascunho.telefone, tamanhoMaximo(20), telefone()),
  };
}
