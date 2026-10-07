import { useRef, type KeyboardEvent } from 'react';

type Passo = number | 'inicio' | 'fim';

const PASSO_DA_TECLA: Record<string, Passo> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
  Home: 'inicio',
  End: 'fim',
};

interface AtributosDaOpcao {
  ref: (elemento: HTMLButtonElement | null) => void;
  tabIndex: 0 | -1;
  onKeyDown: (evento: KeyboardEvent<HTMLButtonElement>) => void;
}

/**
 * O contrato de teclado do `radiogroup` (WAI-ARIA APG): o grupo é uma parada só de Tab — a opção
 * escolhida, ou a primeira se nenhuma estiver —, e as setas, Home e End movem o foco e a escolha
 * juntos. Sem isso, o leitor de tela anuncia "botão de opção, 1 de 3" e as setas não fazem nada.
 *
 * <p>Devolve, para cada índice, os atributos que a opção espalha no próprio `<button role="radio">`.
 */
export function useGrupoDeRadio<V extends string>(
  valores: readonly V[],
  escolhido: string,
  aoEscolher: (valor: V) => void,
): (indice: number) => AtributosDaOpcao {
  const opcoes = useRef<(HTMLButtonElement | null)[]>([]);
  const indiceEscolhido = valores.indexOf(escolhido as V);
  const indiceFocavel = indiceEscolhido >= 0 ? indiceEscolhido : 0;

  function destino(origem: number, passo: Passo): number {
    if (passo === 'inicio') {
      return 0;
    }
    if (passo === 'fim') {
      return valores.length - 1;
    }
    return (origem + passo + valores.length) % valores.length;
  }

  return (indice) => ({
    ref: (elemento) => {
      opcoes.current[indice] = elemento;
    },
    tabIndex: indice === indiceFocavel ? 0 : -1,
    onKeyDown: (evento) => {
      const passo = PASSO_DA_TECLA[evento.key];
      if (passo === undefined) {
        return;
      }
      evento.preventDefault();
      const alvo = destino(indice, passo);
      opcoes.current[alvo]?.focus();
      const valor = valores[alvo];
      if (valor !== undefined) {
        aoEscolher(valor);
      }
    },
  });
}
