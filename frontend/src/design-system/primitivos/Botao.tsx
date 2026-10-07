import type { ReactNode, Ref } from 'react';

import { juntarClasses } from '@/design-system/classes';

import estilos from './Botao.module.css';

export type VarianteDeBotao = 'primario' | 'secundario' | 'contorno' | 'fantasma';
export type TamanhoDeBotao = 'pequeno' | 'medio' | 'grande';

interface BotaoProps {
  children: ReactNode;
  aoClicar?: () => void;
  variante?: VarianteDeBotao;
  tamanho?: TamanhoDeBotao;
  tipo?: 'button' | 'submit';
  /**
   * Inerte, mas ainda focável e na ordem de Tab: com `disabled` nativo o botão some do teclado, e
   * quem navega por Tab nem descobre que o "Salvar" existe. O motivo vai em `descritoPor`.
   */
  desabilitado?: boolean;
  /**
   * Inerte enquanto a ação corre, sem perder o foco: um `disabled` no botão focado manda o foco
   * para o `<body>` no meio do envio.
   */
  carregando?: boolean;
  /** `id` do texto que explica o estado do botão — o que falta para salvar, por exemplo. */
  descritoPor?: string;
  /** Ornamento ao fim do rótulo. Decorativo: não substitui o texto do botão. */
  iconeAoFim?: ReactNode;
  /** Ocupa toda a largura disponível, para formulário em coluna. */
  largura?: 'natural' | 'total';
  /** Nome acessível quando o rótulo visível não basta — botão só de ícone, por exemplo. */
  rotuloAcessivel?: string;
  /**
   * `critico` deixa o rótulo em tom de perigo (a ação segue secundária; só a cor muda).
   * `positivo` pinta o primário de verde — o "✓ Concluir" do protótipo, que fecha uma pendência.
   */
  tom?: 'padrao' | 'critico' | 'positivo';
  /** Para quem precisa devolver o foco ao botão quando o que o substituiu sai de cena. */
  ref?: Ref<HTMLButtonElement>;
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
  rotuloAcessivel,
  tom = 'padrao',
  descritoPor,
  ref,
}: BotaoProps) {
  const inerte = desabilitado || carregando;

  return (
    <button
      ref={ref}
      type={tipo === 'submit' ? 'submit' : 'button'}
      className={juntarClasses(
        estilos.botao,
        estilos[variante],
        estilos[tamanho],
        largura === 'total' && estilos.total,
        tom === 'critico' && estilos.critico,
        tom === 'positivo' && variante === 'primario' && estilos.positivo,
      )}
      aria-label={rotuloAcessivel}
      aria-describedby={descritoPor}
      onClick={(evento) => {
        // O `preventDefault` segura também o envio implícito do formulário pelo Enter.
        if (inerte) {
          evento.preventDefault();
          return;
        }
        aoClicar?.();
      }}
      aria-disabled={inerte || undefined}
      aria-busy={carregando || undefined}
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
