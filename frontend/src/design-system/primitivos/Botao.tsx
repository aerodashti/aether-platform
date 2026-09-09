import type { ReactNode } from 'react';

import { juntarClasses } from '@/design-system/classes';

import estilos from './Botao.module.css';

export type VarianteDeBotao = 'primario' | 'secundario' | 'contorno';
export type TamanhoDeBotao = 'medio' | 'grande';

interface BotaoProps {
  children: ReactNode;
  aoClicar?: () => void;
  variante?: VarianteDeBotao;
  tamanho?: TamanhoDeBotao;
  tipo?: 'button' | 'submit';
  desabilitado?: boolean;
  /** Mantém o botão inerte e anuncia a espera para leitores de tela. */
  carregando?: boolean;
  /** Ornamento ao fim do rótulo. Decorativo: não substitui o texto do botão. */
  iconeAoFim?: ReactNode;
  /** Ocupa toda a largura disponível, para formulário em coluna. */
  largura?: 'natural' | 'total';
}

export function Botao({
  children,
  aoClicar,
  variante = 'primario',
  tamanho = 'medio',
  tipo = 'button',
  desabilitado = false,
  carregando = false,
  iconeAoFim,
  largura = 'natural',
}: BotaoProps) {
  return (
    <button
      type={tipo === 'submit' ? 'submit' : 'button'}
      className={juntarClasses(
        estilos.botao,
        estilos[variante],
        estilos[tamanho],
        largura === 'total' && estilos.total,
      )}
      onClick={aoClicar}
      disabled={desabilitado || carregando}
      aria-busy={carregando}
    >
      {variante === 'contorno' ? (
        <>
          {/* O rótulo sai deslizando e o par rótulo+seta entra no lugar enquanto o fundo se
              preenche. As duas camadas são a mesma palavra: só uma fica visível por vez, e a que
              sai de cena é a que continua contando para o nome acessível. */}
          <span className={estilos.rotulo}>{children}</span>
          <span className={estilos.desliza} aria-hidden="true">
            {children}
            {iconeAoFim}
          </span>
        </>
      ) : (
        <>
          {children}
          {iconeAoFim}
        </>
      )}
    </button>
  );
}
