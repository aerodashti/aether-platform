import { Route, Routes } from 'react-router-dom';

import { LayoutRaiz } from '@/app/LayoutRaiz';
import { PaginaDeLogin } from '@/features/autenticacao/componentes/PaginaDeLogin';
import { PaginaSaude } from '@/features/saude/componentes/PaginaSaude';

export function Rotas() {
  return (
    <Routes>
      {/* Fora do LayoutRaiz: a tela de entrada ocupa a viewport inteira e não tem cabeçalho de
          aplicação. Ela ainda não é a porta de entrada de `/` porque não existe área logada a
          proteger — essa ligação entra junto com a primeira tela que exigir sessão. */}
      <Route path="/entrar" element={<PaginaDeLogin />} />
      <Route element={<LayoutRaiz />}>
        <Route index element={<PaginaSaude />} />
      </Route>
    </Routes>
  );
}
