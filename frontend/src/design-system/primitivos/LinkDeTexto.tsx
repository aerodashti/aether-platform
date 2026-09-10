import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { juntarClasses } from '@/design-system/classes';

import estilos from './LinkDeTexto.module.css';

interface LinkDeTextoProps {
  para: string;
  children: ReactNode;
  /** Monoespaçada, para identificador: matrícula, rel. de voo, nota fiscal. */
  mono?: boolean;
}

/**
 * Link de texto dentro do conteúdo — a matrícula que abre a aeronave, por exemplo.
 *
 * <p>É `Link` de verdade, não botão com `navigate()`: abrir em nova aba, copiar o endereço e o
 * histórico funcionam sem código nenhum. Distinto de {@code LinkDeNavegacao}, que é o item da
 * barra lateral, e de {@code BotaoDeLink}, que é ação sem navegação.
 */
export function LinkDeTexto({ para, children, mono = false }: LinkDeTextoProps) {
  return (
    <Link to={para} className={juntarClasses(estilos.link, mono && estilos.mono)}>
      {children}
    </Link>
  );
}
