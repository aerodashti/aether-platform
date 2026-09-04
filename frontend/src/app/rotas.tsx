import { Route, Routes } from 'react-router-dom';

import { LayoutRaiz } from '@/app/LayoutRaiz';
import { PaginaSaude } from '@/features/saude/componentes/PaginaSaude';

export function Rotas() {
  return (
    <Routes>
      <Route element={<LayoutRaiz />}>
        <Route index element={<PaginaSaude />} />
      </Route>
    </Routes>
  );
}
