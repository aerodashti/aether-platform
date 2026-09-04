import { Outlet } from 'react-router-dom';

import { Texto } from '@/design-system/primitivos/Texto';

import estilos from './LayoutRaiz.module.css';

export function LayoutRaiz() {
  return (
    <div className={estilos.moldura}>
      <header className={estilos.topo}>
        <Texto variante="legenda" tom="suave" como="span">
          Aether
        </Texto>
      </header>
      <main className={estilos.conteudo}>
        <Outlet />
      </main>
    </div>
  );
}
