import { useId } from 'react';

import { juntarClasses } from '@/design-system/classes';

import estilos from './AreaDeTexto.module.css';

interface AreaDeTextoProps {
  rotulo: string;
  valor: string;
  aoMudar: (valor: string) => void;
  exemplo?: string;
  maxLength?: number;
  linhas?: number;
  rotuloOculto?: boolean;
}

/**
 * Texto livre de várias linhas — as observações de um trecho, por exemplo. O irmão de várias
 * linhas do {@code CampoDeTexto}: mesmo rótulo, mesmo cromo, mesma régua de foco.
 */
export function AreaDeTexto({
  rotulo,
  valor,
  aoMudar,
  exemplo,
  maxLength,
  linhas = 3,
  rotuloOculto = false,
}: AreaDeTextoProps) {
  const id = useId();

  return (
    <div className={estilos.campo}>
      <label
        className={juntarClasses(estilos.rotulo, rotuloOculto && estilos.apenasLeitor)}
        htmlFor={id}
      >
        {rotulo}
      </label>
      <textarea
        id={id}
        className={estilos.entrada}
        value={valor}
        onChange={(evento) => aoMudar(evento.target.value)}
        placeholder={exemplo}
        maxLength={maxLength}
        rows={linhas}
      />
    </div>
  );
}
