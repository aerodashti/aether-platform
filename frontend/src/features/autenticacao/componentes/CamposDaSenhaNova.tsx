import { useValidacao, type Validacao } from '@/compartilhado/formulario/useValidacao';
import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';
import type { Acesso } from '@/features/autenticacao/hooks/usePassosDeAcesso';

import { APOIO_DA_SENHA_NOVA } from './regrasDeAcesso';
import { validarSenhaNova, type CampoDaSenhaNova } from './validacaoDaSenhaNova';

const ROTULOS_DA_SENHA_NOVA: Record<CampoDaSenhaNova, string> = {
  novaSenha: 'Nova senha',
  confirmacao: 'Confirmar nova senha',
};

/** A validação dos dois campos, com a recusa do servidor de quem os envia. */
export function useValidacaoDaSenhaNova(
  acesso: Acesso,
  falha: unknown,
): Validacao<CampoDaSenhaNova> {
  const rascunho = { novaSenha: acesso.campos.novaSenha, confirmacao: acesso.campos.confirmacao };
  return useValidacao({
    erros: validarSenhaNova(rascunho),
    valores: rascunho,
    rotulos: ROTULOS_DA_SENHA_NOVA,
    falha,
  });
}

interface CamposDaSenhaNovaProps {
  acesso: Acesso;
  validacao: Validacao<CampoDaSenhaNova>;
}

/** A senha nova e a confirmação, iguais na recuperação e no convite. */
export function CamposDaSenhaNova({ acesso, validacao }: CamposDaSenhaNovaProps) {
  return (
    <>
      <CampoDeTexto
        rotulo={ROTULOS_DA_SENHA_NOVA.novaSenha}
        tipo="senha"
        obrigatorio
        valor={acesso.campos.novaSenha}
        aoMudar={(valor) => acesso.preencher('novaSenha', valor)}
        erro={validacao.erroDe('novaSenha')}
        apoio={APOIO_DA_SENHA_NOVA}
        autoComplete="new-password"
      />

      <CampoDeTexto
        rotulo={ROTULOS_DA_SENHA_NOVA.confirmacao}
        tipo="senha"
        obrigatorio
        valor={acesso.campos.confirmacao}
        aoMudar={(valor) => acesso.preencher('confirmacao', valor)}
        erro={validacao.erroDe('confirmacao')}
        autoComplete="new-password"
      />
    </>
  );
}
