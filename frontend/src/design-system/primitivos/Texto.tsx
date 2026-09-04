import type { ElementType, ReactNode } from 'react';

import { juntarClasses } from '@/design-system/classes';

import estilos from './Texto.module.css';

export type VarianteDeTexto = 'titulo' | 'subtitulo' | 'corpo' | 'legenda';
export type TomDeTexto = 'padrao' | 'suave' | 'positivo' | 'atencao' | 'critico';

interface TextoProps {
  children: ReactNode;
  variante?: VarianteDeTexto;
  tom?: TomDeTexto;
  /** Troca só o elemento renderizado, sem mudar a aparência. */
  como?: ElementType;
  id?: string;
}

const elementoPadrao: Record<VarianteDeTexto, ElementType> = {
  titulo: 'h1',
  subtitulo: 'h2',
  corpo: 'p',
  legenda: 'span',
};

export function Texto({ children, variante = 'corpo', tom = 'padrao', como, id }: TextoProps) {
  const Elemento = como ?? elementoPadrao[variante];
  return (
    <Elemento id={id} className={juntarClasses(estilos[variante], estilos[tom])}>
      {children}
    </Elemento>
  );
}
