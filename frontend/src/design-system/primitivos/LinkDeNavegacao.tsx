import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

import { juntarClasses } from '@/design-system/classes';

import estilos from './LinkDeNavegacao.module.css';

interface LinkDeNavegacaoProps {
  para: string;
  children: ReactNode;
  /** Ícone à esquerda do rótulo. Decorativo: nunca substitui o texto. */
  icone?: ReactNode;
  /** Casa apenas a rota exata, para que "/" não fique ativa em toda a aplicação. */
  exata?: boolean;
}

/**
 * Item de navegação.
 *
 * <p>É `NavLink`, e não um botão que troca estado: navegação de verdade dá endereço a cada tela,
 * e com isso voltar, abrir em nova aba e compartilhar o link funcionam sem código nenhum. O
 * estado ativo vem do `aria-current` que o próprio NavLink escreve — a barra da esquerda é
 * desenhada a partir dele, não de uma classe paralela que poderia divergir.
 */
export function LinkDeNavegacao({ para, children, icone, exata = false }: LinkDeNavegacaoProps) {
  return (
    <NavLink to={para} end={exata} className={juntarClasses(estilos.link)}>
      {icone ? (
        <span className={estilos.icone} aria-hidden="true">
          {icone}
        </span>
      ) : null}
      <span className={estilos.rotulo}>{children}</span>
    </NavLink>
  );
}
