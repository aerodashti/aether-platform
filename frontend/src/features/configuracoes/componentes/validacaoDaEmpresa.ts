import { emailCompleto, nomeLegivel } from '@/compartilhado/cadastro/regrasDeCadastro';
import {
  obrigatorio,
  primeiraFalha,
  tamanhoMaximo,
  telefone,
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

/** Os limites de `AlterarEmpresaRequest`, que são os das colunas de `empresa`. */
export function validarDadosDaEmpresa(rascunho: RascunhoDaEmpresa): Erros<CampoDaEmpresa> {
  return {
    nomeFantasia: primeiraFalha(
      rascunho.nomeFantasia,
      obrigatorio('Informe o nome fantasia.'),
      tamanhoMaximo(120),
      nomeLegivel(),
    ),
    razaoSocial: primeiraFalha(
      rascunho.razaoSocial,
      obrigatorio('Informe a razão social.'),
      tamanhoMaximo(180),
      nomeLegivel(),
    ),
    email: primeiraFalha(
      rascunho.email,
      obrigatorio('Informe o e-mail.'),
      tamanhoMaximo(180),
      emailCompleto(),
    ),
    telefone: primeiraFalha(
      rascunho.telefone,
      obrigatorio('Informe o telefone.'),
      tamanhoMaximo(20),
      telefone(),
    ),
  };
}
