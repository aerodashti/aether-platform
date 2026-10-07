import { juntarClasses } from '@/design-system/classes';
import { LinkDeTexto } from '@/design-system/primitivos/LinkDeTexto';

import estilos from './GraficoDeBarras.module.css';
import type { Comparativo } from './regras';

interface GraficoDeBarrasProps {
  titulo: string;
  comparativo: Comparativo;
  formatar: (valor: number) => string;
  /** As séries da legenda; com duas, a barra é dividida (fixo e variável). */
  series: [string] | [string, string];
}

/**
 * Um gráfico do "Comparativo da frota": barras horizontais em CSS, sem biblioteca — são seis linhas
 * e uma marca de média. Os valores estão escritos ao lado de cada barra, então a barra é decorativa
 * para o leitor de tela; quem informa é a lista.
 */
export function GraficoDeBarras({ titulo, comparativo, formatar, series }: GraficoDeBarrasProps) {
  return (
    <li className={estilos.grafico}>
      <h3 className={estilos.titulo}>{titulo}</h3>
      {comparativo.barras.length === 0 ? (
        <p className={estilos.vazio}>Sem dados nesta competência.</p>
      ) : (
        <>
          <ul className={estilos.barras} aria-label={titulo}>
            {comparativo.barras.map((barra) => (
              <li key={barra.aeronaveId} className={estilos.linha}>
                <span className={estilos.rotulo}>{barra.rotulo}</span>
                <span className={estilos.trilho} aria-hidden="true">
                  {/* Larguras são o dado: a fração do maior valor. */}
                  <span className={estilos.serie1} style={{ width: `${barra.largura1}%` }} />
                  {series.length === 2 ? (
                    <span className={estilos.serie2} style={{ width: `${barra.largura2}%` }} />
                  ) : null}
                </span>
                <span className={estilos.valor}>{formatar(barra.valor)}</span>
              </li>
            ))}
          </ul>
          <div className={estilos.media}>
            <span className={estilos.rotulo}>Média</span>
            <span className={estilos.regua} aria-hidden="true">
              <span className={estilos.marca} style={{ left: `${comparativo.posicaoDaMedia}%` }} />
            </span>
            <span className={estilos.valorDaMedia}>{formatar(comparativo.media)}</span>
          </div>
          {comparativo.outras > 0 ? (
            <span className={estilos.mais}>
              <LinkDeTexto para="/aeronaves">
                +{comparativo.outras} outras aeronaves — ver todas →
              </LinkDeTexto>
            </span>
          ) : null}
          <div className={estilos.legenda} aria-hidden="true">
            {series.map((serie, indice) => (
              <span key={serie} className={estilos.itemDaLegenda}>
                <span
                  className={juntarClasses(
                    estilos.amostra,
                    indice === 0 ? estilos.serie1 : estilos.serie2,
                  )}
                />
                {serie}
              </span>
            ))}
          </div>
        </>
      )}
    </li>
  );
}
