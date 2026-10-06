import { useEffect, useId, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react';

import estilos from './MenuSuspenso.module.css';

export interface ItemDeMenu {
  rotulo: string;
  /** Uma linha que diz o que o item faz — "Despesa fixa ou variável". */
  apoio?: string;
  aoEscolher: () => void;
}

interface MenuSuspensoProps {
  /** O rótulo do botão que abre o menu. */
  rotulo: string;
  /** O título em versalete no alto da lista — "Registro rápido". */
  titulo?: string;
  itens: ItemDeMenu[];
}

/**
 * Um botão que abre uma lista curta de ações, como o "+ Registrar" da casca.
 *
 * <p>É o padrão *disclosure* (`aria-expanded` + `aria-controls`), não um `role="menu"`: menu de
 * verdade promete setas, foco itinerante e digitação para buscar, e uma lista de quatro botões
 * ganha mais com o Tab que todo mundo já conhece. Esc fecha e devolve o foco ao botão; clicar
 * fora ou levar o foco para fora também fecha.
 */
export function MenuSuspenso({ rotulo, titulo, itens }: MenuSuspensoProps) {
  const [aberto, setAberto] = useState(false);
  const id = useId();
  const raiz = useRef<HTMLDivElement>(null);
  const gatilho = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aberto) {
      return undefined;
    }
    function aoPressionarFora(evento: PointerEvent) {
      if (!raiz.current?.contains(evento.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener('pointerdown', aoPressionarFora);
    return () => document.removeEventListener('pointerdown', aoPressionarFora);
  }, [aberto]);

  function aoTeclar(evento: KeyboardEvent) {
    if (evento.key === 'Escape' && aberto) {
      evento.stopPropagation();
      setAberto(false);
      gatilho.current?.focus();
    }
  }

  function aoPerderFoco(evento: FocusEvent<HTMLDivElement>) {
    if (!raiz.current?.contains(evento.relatedTarget as Node | null)) {
      setAberto(false);
    }
  }

  return (
    // O Esc é ouvido na raiz porque o foco pode estar no gatilho ou em qualquer item.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div className={estilos.raiz} ref={raiz} onKeyDown={aoTeclar} onBlur={aoPerderFoco}>
      <button
        ref={gatilho}
        type="button"
        className={estilos.gatilho}
        aria-expanded={aberto}
        aria-controls={id}
        onClick={() => setAberto((atual) => !atual)}
      >
        <span>{rotulo}</span>
        <span className={estilos.seta} aria-hidden="true">
          ▾
        </span>
      </button>
      <div id={id} className={estilos.painel} hidden={!aberto}>
        {titulo ? (
          <div className={estilos.titulo} aria-hidden="true">
            {titulo}
          </div>
        ) : null}
        <ul className={estilos.lista} aria-label={titulo ?? rotulo}>
          {itens.map((item) => (
            <li key={item.rotulo}>
              <button
                type="button"
                className={estilos.item}
                onClick={() => {
                  setAberto(false);
                  item.aoEscolher();
                }}
              >
                <span className={estilos.itemRotulo}>{item.rotulo}</span>
                {item.apoio ? <span className={estilos.itemApoio}>{item.apoio}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
