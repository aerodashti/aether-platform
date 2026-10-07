import { type Ref } from 'react';

import { juntarClasses } from '@/design-system/classes';

import estilos from './AreaDeTexto.module.css';
import { MolduraDeCampo } from './MolduraDeCampo';

interface AreaDeTextoProps {
  rotulo: string;
  valor: string;
  aoMudar: (valor: string) => void;
  exemplo?: string;
  /** Com limite, a área mostra quanto já foi usado: o corte do `maxLength` é silencioso. */
  maxLength?: number;
  linhas?: number;
  rotuloOculto?: boolean;
  obrigatorio?: boolean;
  apoio?: string;
  erro?: string;
  desabilitado?: boolean;
  ref?: Ref<HTMLTextAreaElement>;
}

/**
 * Texto livre de várias linhas — as observações de um trecho, por exemplo. O irmão de várias
 * linhas do {@code CampoDeTexto}: mesmo rótulo, mesmo cromo, mesma régua de foco e de erro.
 */
export function AreaDeTexto({
  rotulo,
  valor,
  aoMudar,
  exemplo,
  maxLength,
  linhas = 3,
  rotuloOculto = false,
  obrigatorio = false,
  apoio,
  erro,
  desabilitado = false,
  ref,
}: AreaDeTextoProps) {
  const contagem = maxLength === undefined ? null : `${valor.length} de ${maxLength} caracteres`;
  const textoDeApoio = [apoio, contagem].filter(Boolean).join(' · ') || undefined;

  return (
    <MolduraDeCampo
      rotulo={rotulo}
      rotuloOculto={rotuloOculto}
      obrigatorio={obrigatorio}
      apoio={textoDeApoio}
      erro={erro}
    >
      {(atributos) => (
        <textarea
          {...atributos}
          ref={ref}
          className={juntarClasses(estilos.entrada, erro && estilos.invalida)}
          value={valor}
          onChange={(evento) => aoMudar(evento.target.value)}
          placeholder={exemplo}
          maxLength={maxLength}
          rows={linhas}
          disabled={desabilitado}
        />
      )}
    </MolduraDeCampo>
  );
}
