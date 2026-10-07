import { juntarClasses } from '@/design-system/classes';
import { CLASSE_DA_COR, type CorDeIdentificacao } from '@/design-system/primitivos/SeletorDeCor';

import { horasEmTexto, kmEmTexto } from './rotulos';
import type { UsoDoProprietario } from './usoDoRecorte';
import estilos from './UsoPorProprietario.module.css';

/**
 * Os cartões de % de uso do protótipo, acima da grade: quanto de cada proprietário entra no rateio
 * por uso desta aeronave no recorte. A barra é a fração das horas atribuídas, na cor de quem voou.
 */
export function UsoPorProprietario({ usos }: { usos: UsoDoProprietario[] }) {
  if (usos.length === 0) {
    return null;
  }
  return (
    <ul className={estilos.lista} aria-label="Uso da aeronave por proprietário">
      {usos.map((uso) => {
        const percentual = uso.percentual.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
        return (
          <li
            key={uso.proprietarioId}
            className={juntarClasses(
              estilos.cartao,
              CLASSE_DA_COR[(uso.corDeIdentificacao ?? 'CINZA') as CorDeIdentificacao],
            )}
          >
            <div className={estilos.topo}>
              <span className={estilos.nome}>{uso.nome}</span>
              <span className={estilos.percentual}>{percentual}%</span>
            </div>
            <span className={estilos.apoio}>
              {horasEmTexto(uso.horas)} · {kmEmTexto(uso.km)} km
            </span>
            {/* A largura é o dado: vem do percentual, não de um token. */}
            <div className={estilos.trilho} aria-hidden="true">
              <div className={estilos.barra} style={{ width: `${uso.percentual}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
