import { useId, type ReactNode } from 'react';

import { juntarClasses } from '@/design-system/classes';

import estilos from './MolduraDeCampo.module.css';

/** O que a moldura entrega ao controle para que rótulo, apoio e erro cheguem ao leitor de tela. */
export interface AtributosDoControle {
  id: string;
  'aria-labelledby'?: string;
  'aria-required'?: true;
  'aria-invalid'?: true;
  'aria-describedby'?: string;
}

interface MolduraDeCampoProps {
  rotulo: string;
  /**
   * `controle`: o rótulo é um `<label>` ligado ao campo pelo `id` (input, select, textarea).
   * `grupo`: o rótulo é texto com `id`, e o grupo o usa como `aria-labelledby` — um `radiogroup`
   * não tem `<label>` que o nomeie.
   */
  como?: 'controle' | 'grupo';
  rotuloOculto?: boolean;
  obrigatorio?: boolean;
  apoio?: ReactNode;
  erro?: string;
  children: (atributos: AtributosDoControle) => ReactNode;
}

/**
 * A régua comum dos campos de formulário: rótulo (com o asterisco do obrigatório), o controle,
 * o texto de apoio e a mensagem de erro, e os atributos que ligam tudo isso para o leitor de tela.
 *
 * <p>Existe para que cada primitivo de formulário não reimplemente — e esqueça um pedaço de —
 * `aria-required`, `aria-invalid` e `aria-describedby`. O primitivo cuida só do próprio controle.
 */
export function MolduraDeCampo({
  rotulo,
  como = 'controle',
  rotuloOculto = false,
  obrigatorio = false,
  apoio,
  erro,
  children,
}: MolduraDeCampoProps) {
  const id = useId();
  const idDoRotulo = `${id}-rotulo`;
  const idDoErro = `${id}-erro`;
  const idDoApoio = `${id}-apoio`;

  // Um campo pode ter apoio e erro ao mesmo tempo; o leitor de tela deve ouvir os dois, o erro antes.
  const descritores = [erro ? idDoErro : null, apoio ? idDoApoio : null].filter(Boolean).join(' ');
  const classeDoRotulo = juntarClasses(
    estilos.rotulo,
    rotuloOculto && estilos.apenasLeitor,
    obrigatorio && estilos.obrigatorio,
  );

  return (
    <div className={estilos.campo}>
      {como === 'controle' ? (
        <label className={classeDoRotulo} htmlFor={id}>
          {rotulo}
        </label>
      ) : (
        <span className={classeDoRotulo} id={idDoRotulo}>
          {rotulo}
        </span>
      )}
      {children({
        id,
        'aria-labelledby': como === 'grupo' ? idDoRotulo : undefined,
        'aria-required': obrigatorio ? true : undefined,
        'aria-invalid': erro ? true : undefined,
        'aria-describedby': descritores || undefined,
      })}
      {apoio ? (
        <span className={estilos.apoio} id={idDoApoio}>
          {apoio}
        </span>
      ) : null}
      {erro ? (
        <span className={estilos.erro} id={idDoErro}>
          {erro}
        </span>
      ) : null}
    </div>
  );
}
