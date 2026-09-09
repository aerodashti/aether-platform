import type { ReactNode } from 'react';

import { juntarClasses } from '@/design-system/classes';

import estilos from './BotaoDeLink.module.css';

export type AlinhamentoDeLink = 'esquerda' | 'centro';

interface BotaoDeLinkProps {
  children: ReactNode;
  aoClicar: () => void;
  /** Ornamento antes do rótulo, como a seta de "voltar". Decorativo. */
  iconeAoInicio?: ReactNode;
  alinhamento?: AlinhamentoDeLink;
  /** Ocupa a linha inteira, para o link que fecha um formulário em coluna. */
  largura?: 'natural' | 'total';
  desabilitado?: boolean;
}

/**
 * Ação que se parece com um link mas não navega — "Esqueci minha senha", "Voltar", "Reenviar".
 *
 * <p>É um {@code button} de propósito: o elemento precisa responder a Espaço além de Enter e ser
 * anunciado como botão, coisas que um {@code a} sem href não faz. O primitivo existe porque o reset
 * do cromo nativo do botão tem que morar num lugar só.
 */
export function BotaoDeLink({
  children,
  aoClicar,
  iconeAoInicio,
  alinhamento = 'esquerda',
  largura = 'natural',
  desabilitado = false,
}: BotaoDeLinkProps) {
  return (
    <button
      type="button"
      className={juntarClasses(
        estilos.link,
        estilos[alinhamento],
        largura === 'total' && estilos.total,
      )}
      onClick={aoClicar}
      disabled={desabilitado}
    >
      {iconeAoInicio}
      {children}
    </button>
  );
}
