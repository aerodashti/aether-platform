import type { ReactNode, RefObject } from 'react';

import estilos from './FormularioDoCartao.module.css';

interface FormularioDoCartaoProps {
  /** Quem envia é o botão `submit` ou o Enter num campo; a validação é a da tela. */
  aoEnviar: () => void;
  /** O `refDoFormulario` de `useValidacao`: é onde ele procura o primeiro campo inválido. */
  refDoFormulario: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}

/**
 * O `<form>` de um cartão de Configurações. Com ele, Enter num campo salva, como na tela de entrada.
 * `noValidate` desliga o balão do navegador: quem diz o que falta é a validação do formulário.
 */
export function FormularioDoCartao({
  aoEnviar,
  refDoFormulario,
  children,
}: FormularioDoCartaoProps) {
  return (
    <form
      noValidate
      onSubmit={(evento) => {
        evento.preventDefault();
        aoEnviar();
      }}
    >
      <div ref={refDoFormulario} className={estilos.campos}>
        {children}
      </div>
    </form>
  );
}
