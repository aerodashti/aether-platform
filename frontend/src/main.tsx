import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { Provedores } from '@/app/Provedores';
import { Rotas } from '@/app/rotas';

import './design-system/tokens/tokens.css';
import './app/global.css';

const raiz = document.getElementById('raiz');
if (!raiz) {
  throw new Error('Elemento #raiz não encontrado no index.html.');
}

createRoot(raiz).render(
  <StrictMode>
    <Provedores>
      <Rotas />
    </Provedores>
  </StrictMode>,
);
