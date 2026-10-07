import {
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

import { juntarClasses } from '@/design-system/classes';

import estilos from './MenuSuspenso.module.css';

export interface ItemDeMenu {
  rotulo: string;
  /** Uma linha que diz o que o item faz — "Despesa fixa ou variável". */
  apoio?: string;
  aoEscolher: () => void;
}

interface MenuSuspensoProps {
  /** O rótulo do botão que abre o menu; com `icone`, vira o nome acessível do botão. */
  rotulo: string;
  /** O título em versalete no alto da lista — "Registro rápido". */
  titulo?: string;
  itens: ItemDeMenu[];
  /** Gatilho só de ícone, quadrado — o sino da casca. */
  icone?: ReactNode;
  /** O número no canto do gatilho — avisos não lidos. Zero não aparece. */
  contagem?: number;
  /** O que a lista diz quando não há itens. */
  vazio?: string;
  /** Uma ação fixa no pé da lista, separada dos itens — "Abrir central de avisos". */
  rodape?: ItemDeMenu;
}

/**
 * Um botão que abre uma lista curta de ações, como o "+ Registrar" da casca.
 *
 * <p>É o padrão *disclosure* (`aria-expanded` + `aria-controls`), não um `role="menu"`: menu de
 * verdade promete setas, foco itinerante e digitação para buscar, e uma lista de quatro botões
 * ganha mais com o Tab que todo mundo já conhece. Esc fecha e devolve o foco ao botão; clicar
 * fora ou levar o foco para fora também fecha.
 */
export function MenuSuspenso({
  rotulo,
  titulo,
  itens,
  icone,
  contagem = 0,
  vazio,
  rodape,
}: MenuSuspensoProps) {
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

  /**
   * O foco volta ao gatilho antes da ação: o item vai sumir com o painel, e um painel modal aberto
   * pela ação guarda quem tinha o foco para devolvê-lo ao fechar — tem de ser o gatilho, visível.
   */
  function escolher(item: ItemDeMenu) {
    gatilho.current?.focus();
    setAberto(false);
    item.aoEscolher();
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
        className={juntarClasses(estilos.gatilho, icone != null && estilos.soIcone)}
        aria-expanded={aberto}
        aria-controls={id}
        aria-label={
          icone != null ? (contagem > 0 ? `${rotulo}: ${contagem} não lidos` : rotulo) : undefined
        }
        onClick={() => setAberto((atual) => !atual)}
      >
        {icone != null ? (
          icone
        ) : (
          <>
            <span>{rotulo}</span>
            <span className={estilos.seta} aria-hidden="true">
              ▾
            </span>
          </>
        )}
        {contagem > 0 ? (
          <span className={estilos.contagem} aria-hidden="true">
            {contagem > 99 ? '99+' : contagem}
          </span>
        ) : null}
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
              <button type="button" className={estilos.item} onClick={() => escolher(item)}>
                <span className={estilos.itemRotulo}>{item.rotulo}</span>
                {item.apoio ? <span className={estilos.itemApoio}>{item.apoio}</span> : null}
              </button>
            </li>
          ))}
        </ul>
        {itens.length === 0 && vazio ? <p className={estilos.vazio}>{vazio}</p> : null}
        {rodape ? (
          <button type="button" className={estilos.rodape} onClick={() => escolher(rodape)}>
            {rodape.rotulo}
          </button>
        ) : null}
      </div>
    </div>
  );
}
