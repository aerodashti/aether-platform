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
  /**
   * `sublinhado` (padrão): rótulos sobre uma régua, a ativa sublinhada. `trilho`: abas sobre um
   * fundo azulado, a ativa em branco, contagem num círculo — Trocas e Central de avisos.
   * `contorno`: abas coladas numa caixa com borda — Aportes · Rendimentos. `fichas`: cada aba é
   * uma ficha com borda — as categorias de Lançamentos.
   */
  variante?: 'sublinhado' | 'trilho' | 'contorno' | 'fichas';
}

/**
 * Abas de conteúdo, no risco do protótipo: rótulos em linha sobre uma régua, a ativa com o
 * sublinhado de 3px na cor de ação. Quem escolhe a aba decide o que renderizar — o primitivo só
 * cuida da lista, do estado e da semântica (`tablist`/`tab`).
 */
export function Abas<T extends string>({
  rotulo,
  abas,
  valor,
  aoEscolher,
  variante = 'sublinhado',
}: AbasProps<T>) {
  return (
    <div
      className={juntarClasses(estilos.lista, variante !== 'sublinhado' && estilos[variante])}
      role="tablist"
      aria-label={rotulo}
    >
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
