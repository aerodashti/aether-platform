import { nomeLegivel } from '@/compartilhado/cadastro/regrasDeCadastro';
import {
  email,
  obrigatorio,
  primeiraFalha,
  tamanhoMaximo,
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

/** Os limites de `ConvidarUsuarioRequest`, que são os das colunas de `usuario`. */
export function validarConvite(rascunho: RascunhoDoConvite): Erros<CampoDoConvite> {
  return {
    nome: primeiraFalha(
      rascunho.nome,
      obrigatorio('Informe o nome.'),
      tamanhoMaximo(120),
      nomeLegivel(),
    ),
    email: primeiraFalha(
      rascunho.email,
      obrigatorio('Informe o e-mail.'),
      tamanhoMaximo(180),
      email(),
    ),
    papel: primeiraFalha(rascunho.papel, obrigatorio('Escolha o papel.')),
  };
}
