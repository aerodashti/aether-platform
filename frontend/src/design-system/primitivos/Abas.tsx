import { juntarClasses } from '@/design-system/classes';

import estilos from './Abas.module.css';

export interface Aba<T extends string> {
  valor: T;
  rotulo: string;
  /** Contagem ao lado do rótulo, quando houver — "Fixos 12". */
  contagem?: number;
}

interface AbasProps<T extends string> {
  /** Nome acessível da lista de abas: "Seções da manutenção". */
  rotulo: string;
  abas: Array<Aba<T>>;
  valor: T;
  aoEscolher: (valor: T) => void;
}

/**
 * Abas de conteúdo, no risco do protótipo: rótulos em linha sobre uma régua, a ativa com o
 * sublinhado de 3px na cor de ação. Quem escolhe a aba decide o que renderizar — o primitivo só
 * cuida da lista, do estado e da semântica (`tablist`/`tab`).
 */
export function Abas<T extends string>({ rotulo, abas, valor, aoEscolher }: AbasProps<T>) {
  return (
    <div className={estilos.lista} role="tablist" aria-label={rotulo}>
      {abas.map((aba) => {
        const ativa = aba.valor === valor;
        return (
          <button
            key={aba.valor}
            type="button"
            role="tab"
            aria-selected={ativa}
            className={juntarClasses(estilos.aba, ativa && estilos.ativa)}
            onClick={() => aoEscolher(aba.valor)}
          >
            <span>{aba.rotulo}</span>
            {aba.contagem !== undefined ? (
              <span className={estilos.contagem} aria-label={`${aba.contagem} itens`}>
                {aba.contagem}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
