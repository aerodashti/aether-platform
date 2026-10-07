import {
  email,
  obrigatorio,
  primeiraFalha,
  tamanhoMaximo,
  type Regra,
} from '@/compartilhado/formulario/regras';
import type { Erros } from '@/compartilhado/formulario/useValidacao';
import type { PapelDoUsuario } from '@/compartilhado/sessao/sessao';

/** Os campos de `ConvidarUsuarioRequest`: o `campos` do 400 cai no campo de mesmo nome. */
export type CampoDoConvite = 'nome' | 'email' | 'papel';

export interface RascunhoDoConvite {
  nome: string;
  email: string;
  papel: PapelDoUsuario;
}

export const ROTULOS_DO_CONVITE: Record<CampoDoConvite, string> = {
  nome: 'Nome',
  email: 'E-mail',
  papel: 'Papel',
};

const MENSAGEM_DE_EMAIL = 'Informe um e-mail completo, como nome@empresa.com.br.';

/**
 * O `FormatoDeEmail` do servidor: o domínio precisa de ponto e de um sufixo de duas letras. O
 * `email()` comum ainda aceita "fulano@exemplo" — e o convite para ele nunca chegaria.
 */
const dominioCompleto: Regra = (texto) =>
  /@[^@]+\.[^@.]{2,}$/.test(texto.trim()) ? undefined : MENSAGEM_DE_EMAIL;

/** Os limites de `ConvidarUsuarioRequest`, que são os das colunas de `usuario`. */
export function validarConvite(rascunho: RascunhoDoConvite): Erros<CampoDoConvite> {
  return {
    nome: primeiraFalha(rascunho.nome, obrigatorio('Informe o nome.'), tamanhoMaximo(120)),
    email: primeiraFalha(
      rascunho.email,
      obrigatorio('Informe o e-mail.'),
      tamanhoMaximo(180),
      email(MENSAGEM_DE_EMAIL),
      dominioCompleto,
    ),
    papel: primeiraFalha(rascunho.papel, obrigatorio('Escolha o papel.')),
  };
}
