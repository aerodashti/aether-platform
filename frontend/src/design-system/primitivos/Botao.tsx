import type { ReactNode } from 'react';

import { juntarClasses } from '@/design-system/classes';

import estilos from './Botao.module.css';

export type VarianteDeBotao = 'primario' | 'secundario';

interface BotaoProps {
  children: ReactNode;
  aoClicar?: () => void;
  variante?: VarianteDeBotao;
  tipo?: 'button' | 'submit';
  desabilitado?: boolean;
  /** Mantém o botão inerte e anuncia a espera para leitores de tela. */
  carregando?: boolean;
}

export function Botao({
  children,
  aoClicar,
  variante = 'primario',
  tipo = 'button',
  desabilitado = false,
  carregando = false,
}: BotaoProps) {
  return (
    <button
      type={tipo === 'submit' ? 'submit' : 'button'}
      className={juntarClasses(estilos.botao, estilos[variante])}
      onClick={aoClicar}
      disabled={desabilitado || carregando}
      aria-busy={carregando}
    >
      {children}
    </button>
  );
}
