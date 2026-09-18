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
 * <p>Fica na feature, não no design system: uma tela só o usa. O título é o `.sec-titulo` do
 * protótipo — 14px forte, em frase normal — e não o título de tela.
 */
export function Cartao({ titulo, descricao, children }: CartaoProps) {
  return (
    <section className={estilos.cartao} aria-label={titulo}>
      <h2 className={estilos.titulo}>{titulo}</h2>
      {descricao ? (
        <Texto variante="apoio" tom="suave" como="p">
          {descricao}
        </Texto>
      ) : null}
      <div className={estilos.corpo}>{children}</div>
    </section>
  );
}
