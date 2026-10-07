import { useEffect } from 'react';

/**
 * Enquanto `ativo`, fechar a aba ou recarregar a página pede confirmação ao navegador: um cadastro
 * de vinte e tantos campos não se perde por um Ctrl+W. A navegação dentro do app não passa por
 * aqui — o `BrowserRouter` não tem bloqueio de rota; quem sai pelo Cancelar é perguntado pela tela.
 */
export function useAvisoAoSair(ativo: boolean): void {
  useEffect(() => {
    if (!ativo) {
      return undefined;
    }
    function avisar(evento: BeforeUnloadEvent) {
      evento.preventDefault();
    }
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [ativo]);
}
