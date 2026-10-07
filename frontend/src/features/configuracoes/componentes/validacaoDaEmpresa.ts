import {
  email,
  obrigatorio,
  primeiraFalha,
  tamanhoMaximo,
  telefone,
  type Regra,
} from '@/compartilhado/formulario/regras';
import type { Erros } from '@/compartilhado/formulario/useValidacao';

export type CampoDaEmpresa = 'nomeFantasia' | 'razaoSocial' | 'email' | 'telefone';

export type RascunhoDaEmpresa = Record<CampoDaEmpresa, string>;

export const ROTULOS_DA_EMPRESA: Record<CampoDaEmpresa, string> = {
  nomeFantasia: 'Nome fantasia',
  razaoSocial: 'Razão social',
  email: 'E-mail',
  telefone: 'Telefone',
};

const MENSAGEM_DE_EMAIL = 'Informe um e-mail completo, como nome@empresa.com.br.';

/**
 * O `FormatoDeEmail` do servidor: o domínio precisa de ponto e de um sufixo de duas letras. O
 * `email()` comum ainda aceita "contato@empresa", que o servidor recusa.
 */
const dominioCompleto: Regra = (texto) =>
  /@[^@]+\.[^@.]{2,}$/.test(texto.trim()) ? undefined : MENSAGEM_DE_EMAIL;

/** Os limites de `AlterarEmpresaRequest`, que são os das colunas de `empresa`. */
export function validarDadosDaEmpresa(rascunho: RascunhoDaEmpresa): Erros<CampoDaEmpresa> {
  return {
    nomeFantasia: primeiraFalha(
      rascunho.nomeFantasia,
      obrigatorio('Informe o nome fantasia.'),
      tamanhoMaximo(120),
    ),
    razaoSocial: primeiraFalha(
      rascunho.razaoSocial,
      obrigatorio('Informe a razão social.'),
      tamanhoMaximo(180),
    ),
    email: primeiraFalha(
      rascunho.email,
      obrigatorio('Informe o e-mail.'),
      tamanhoMaximo(180),
      email(MENSAGEM_DE_EMAIL),
      dominioCompleto,
    ),
    telefone: primeiraFalha(
      rascunho.telefone,
      obrigatorio('Informe o telefone.'),
      tamanhoMaximo(20),
      telefone(),
    ),
  };
}
