import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useSessao } from './sessao';

/**
 * Porta da área logada.
 *
 * <p>Enquanto a sessão está sendo consultada não renderiza nem o conteúdo nem o redirecionamento:
 * mandar para a tela de entrada antes da resposta faria quem já está logado ver um pisca-pisca de
 * login a cada F5.
 *
 * <p>Isto é conveniência de interface, não segurança. Quem recusa de verdade é a cadeia de
 * autorização do servidor — esconder a rota aqui só evita oferecer o que seria recusado lá.
 */
export function RotaAutenticada() {
  const { autenticado, carregando } = useSessao();
  const localizacao = useLocation();

  if (carregando) {
    return null;
  }

  if (!autenticado) {
    // `state` guarda para onde a pessoa ia, e `replace` evita que o Voltar caia na rota barrada.
    return <Navigate to="/entrar" replace state={{ de: localizacao.pathname }} />;
  }

  return <Outlet />;
}
