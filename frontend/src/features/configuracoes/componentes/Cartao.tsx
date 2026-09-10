import type { ReactNode } from 'react';

import { Texto } from '@/design-system/primitivos/Texto';

import estilos from './Cartao.module.css';

interface CartaoProps {
  titulo: string;
  descricao?: string;
  children: ReactNode;
}

/**
 * Uma seção de Configurações.
 *
 * <p>Card é exceção no produto, e esta é a justificativa: cada seção é uma unidade de decisão
 * independente, com sua própria ação de salvar. Sem a superfície, quatro formulários empilhados
 * viram um formulário só — e a pessoa não sabe o que o botão de baixo salva.
 *
 * <p>Fica na feature, não no design system: uma tela só o usa.
 */
export function Cartao({ titulo, descricao, children }: CartaoProps) {
  return (
    <section className={estilos.cartao}>
      <Texto variante="titulo" como="h2">
        {titulo}
      </Texto>
      {descricao ? (
        <Texto variante="apoio" tom="suave" como="p">
          {descricao}
        </Texto>
      ) : null}
      <div className={estilos.corpo}>{children}</div>
    </section>
  );
}
