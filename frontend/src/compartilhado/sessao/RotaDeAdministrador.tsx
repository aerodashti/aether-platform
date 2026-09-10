import { Navigate, Outlet } from 'react-router-dom';

import { useSessao } from './sessao';

/**
 * Porta das telas restritas a administradores.
 *
 * <p>Vive dentro da {@link RotaAutenticada}: quando chega aqui, já existe sessão. O que falta
 * decidir é só o papel — e quem não é administrador volta para a raiz em vez de ver um erro,
 * porque para essa pessoa a tela não é uma falha, é simplesmente algo que não existe.
 */
export function RotaDeAdministrador() {
  const { carregando, ehAdministrador } = useSessao();

  if (carregando) {
    return null;
  }

  return ehAdministrador ? <Outlet /> : <Navigate to="/" replace />;
}
