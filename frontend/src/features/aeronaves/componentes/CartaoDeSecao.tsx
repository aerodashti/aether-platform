import type { ReactNode } from 'react';

import { Texto } from '@/design-system/primitivos/Texto';

import estilos from './CartaoDeSecao.module.css';

interface CartaoDeSecaoProps {
  /** O nome acessível da região e o título visível da faixa. */
  titulo: string;
  /** Linha de apoio sob o título: período, contagem, o que a seção julga. */
  apoio?: ReactNode;
  /** A ação da faixa, à direita: um botão ou um par deles. */
  acao?: ReactNode;
  children: ReactNode;
}

/**
 * O cartão de seção do detalhe da aeronave, como no protótipo: faixa de cabeçalho com título em
 * frase normal e divisor, e o conteúdo abaixo sem padding próprio — cada seção decide o seu
 * (tabela encosta nas bordas; pares de dados recebem respiro).
 */
export function CartaoDeSecao({ titulo, apoio, acao, children }: CartaoDeSecaoProps) {
  return (
    <section className={estilos.cartao} aria-label={titulo}>
      <div className={estilos.cabecalho}>
        <div className={estilos.titulos}>
          <h2 className={estilos.titulo}>{titulo}</h2>
          {apoio ? (
            <Texto variante="apoio" tom="suave" como="p">
              {apoio}
            </Texto>
          ) : null}
        </div>
        {acao ? <div className={estilos.acao}>{acao}</div> : null}
      </div>
      {children}
    </section>
  );
}
