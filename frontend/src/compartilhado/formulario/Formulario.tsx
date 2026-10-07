import type { ReactNode, RefObject } from 'react';

import estilos from './Formulario.module.css';

interface FormularioProps {
  /** O `refDoFormulario` de `useValidacao`: é onde o primeiro campo inválido é procurado. */
  referencia: RefObject<HTMLDivElement | null>;
  /** Chamado pelo Enter num campo e pelo botão `tipo="submit"` — em geral `validacao.enviar(salvar)`. */
  aoEnviar: () => void;
  /** Nome acessível do formulário, quando a tela tem mais de um. */
  rotulo?: string;
  children: ReactNode;
}

/**
 * O `<form>` dos painéis: Enter num campo envia, como em qualquer formulário da web, e a validação
 * nativa fica desligada (`noValidate`) porque quem valida e mostra os erros é `useValidacao`.
 *
 * <p>O `ref` vai num `div` de dentro para casar com o tipo do `useValidacao`, que também serve a
 * telas sem `<form>`.
 */
export function Formulario({ referencia, aoEnviar, rotulo, children }: FormularioProps) {
  return (
    <form
      noValidate
      aria-label={rotulo}
      onSubmit={(evento) => {
        evento.preventDefault();
        aoEnviar();
      }}
    >
      <div ref={referencia} className={estilos.corpo}>
        {children}
      </div>
    </form>
  );
}
