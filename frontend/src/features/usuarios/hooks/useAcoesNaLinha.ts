import { useReativarUsuario, useReenviarConvite, type UsuarioResponse } from '../api/useUsuarios';
import type { Retorno } from '../componentes/RetornoDaAcao';
import { acessoReativado, conviteReenviado } from '../componentes/rotulos';

/**
 * Reenviar e reativar: as ações que a grade executa direto na linha, sem confirmação, porque
 * nenhuma tira o acesso de ninguém.
 *
 * <p>Cada uma diz como terminou — a recusa do servidor não pode sumir em silêncio — e só a linha
 * clicada fica em andamento, e não todos os botões da página.
 */
export function useAcoesNaLinha(anunciar: (retorno: Retorno | null) => void) {
  const reenviar = useReenviarConvite();
  const reativar = useReativarUsuario();

  function avisarFalha(prefixo: string) {
    return (erro: Error) => anunciar({ tom: 'critico', mensagem: `${prefixo} ${erro.message}` });
  }

  function reenviarConvite(usuario: UsuarioResponse) {
    anunciar(null);
    reenviar.mutate(Number(usuario.id), {
      onSuccess: () => anunciar({ tom: 'positivo', mensagem: conviteReenviado(usuario.email) }),
      onError: avisarFalha(`Não foi possível reenviar o convite para ${usuario.nome}.`),
    });
  }

  function reativarUsuario(usuario: UsuarioResponse) {
    anunciar(null);
    reativar.mutate(Number(usuario.id), {
      onSuccess: (reativado) =>
        anunciar({
          tom: 'positivo',
          mensagem: acessoReativado(usuario.nome, reativado.situacao),
        }),
      onError: avisarFalha(`Não foi possível reativar o acesso de ${usuario.nome}.`),
    });
  }

  return {
    reenviarConvite,
    reativarUsuario,
    reenviando: (id: number) => reenviar.isPending && reenviar.variables === id,
    reativando: (id: number) => reativar.isPending && reativar.variables === id,
  };
}
