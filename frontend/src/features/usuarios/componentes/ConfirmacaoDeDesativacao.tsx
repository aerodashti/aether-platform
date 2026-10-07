import { ResumoDoFormulario } from '@/compartilhado/formulario/ResumoDoFormulario';
import { Botao } from '@/design-system/primitivos/Botao';
import { PainelModal } from '@/design-system/primitivos/PainelModal';
import { Texto } from '@/design-system/primitivos/Texto';

import { useDesativarUsuario, type UsuarioResponse } from '../api/useUsuarios';

import estilos from './Painel.module.css';

interface ConfirmacaoDeDesativacaoProps {
  usuario: UsuarioResponse;
  aoFechar: () => void;
  aoDesativar: (usuario: UsuarioResponse) => void;
}

function consequencia(usuario: UsuarioResponse): string {
  return usuario.situacao === 'PENDENTE'
    ? 'O convite enviado deixa de valer agora. O cadastro fica, e dá para reativar e reenviar o convite depois.'
    : 'A pessoa perde o acesso agora, mesmo com a sessão aberta. O histórico fica, e dá para reativar depois.';
}

/**
 * Desativar corta o acesso no request seguinte: um clique errado numa grade densa não pode fazer
 * isso sozinho. O painel diz de quem e o que acontece, e a recusa do servidor aparece aqui dentro.
 */
export function ConfirmacaoDeDesativacao({
  usuario,
  aoFechar,
  aoDesativar,
}: ConfirmacaoDeDesativacaoProps) {
  const desativar = useDesativarUsuario();
  const falha = desativar.error
    ? `Não foi possível desativar. ${desativar.error.message}`
    : undefined;

  function confirmar() {
    desativar.mutate(Number(usuario.id), { onSuccess: aoDesativar });
  }

  return (
    <PainelModal
      aberto
      aoFechar={aoFechar}
      rotulo={`Desativar ${usuario.nome ?? ''}`}
      podeFechar={!desativar.isPending}
    >
      <Texto variante="titulo" como="h2">
        Desativar usuário · {usuario.nome}
      </Texto>
      <Texto variante="apoio" tom="suave" como="p">
        {consequencia(usuario)}
      </Texto>
      <ResumoDoFormulario resumo={falha} />
      <div className={estilos.acoes}>
        <Botao variante="secundario" aoClicar={aoFechar} desabilitado={desativar.isPending}>
          Cancelar
        </Botao>
        <Botao aoClicar={confirmar} carregando={desativar.isPending}>
          Desativar acesso
        </Botao>
      </div>
    </PainelModal>
  );
}
