import { juntarClasses } from '@/design-system/classes';
import { BotaoDeLink } from '@/design-system/primitivos/BotaoDeLink';

import type { CompetenciaDoPeriodo, FechamentoDoPeriodoResponse } from '../api/useFechamento';

import estilos from './Grade.module.css';
import { competenciaCurta, competenciaPorExtenso, horasEmTexto, moedaEmTexto } from './rotulos';

interface TabelaDoPeriodoProps {
  periodo: FechamentoDoPeriodoResponse;
  aoAbrirCompetencia: (competencia: string) => void;
}

function Valor({ valor, sinal = false }: { valor: number | undefined; sinal?: boolean }) {
  return (
    <span className={juntarClasses(estilos.numero, sinal && (valor ?? 0) < 0 && estilos.devedor)}>
      {moedaEmTexto(valor)}
    </span>
  );
}

function Celulas({ linha }: { linha: CompetenciaDoPeriodo | undefined }) {
  return (
    <>
      <td role="cell" className={estilos.celula}>
        <span className={estilos.numero}>{horasEmTexto(linha?.horas)}</span>
      </td>
      <td role="cell" className={estilos.celula}>
        <Valor valor={linha?.custosFixos} />
      </td>
      <td role="cell" className={estilos.celula}>
        <Valor valor={linha?.custosVariaveis} />
      </td>
      <td role="cell" className={estilos.celula}>
        <Valor valor={linha?.totalDeCustos} />
      </td>
      <td role="cell" className={estilos.celula}>
        <Valor valor={linha?.aportes} />
      </td>
      <td role="cell" className={estilos.celula}>
        <Valor valor={linha?.rendimentos} />
      </td>
      <td role="cell" className={estilos.celula}>
        <Valor valor={linha?.resultado} sinal />
      </td>
      <td role="cell" className={estilos.celula}>
        <Valor valor={linha?.saldoFinal} sinal />
      </td>
    </>
  );
}

/** Uma linha por competência; o saldo final de uma é o inicial da seguinte. */
export function TabelaDoPeriodo({ periodo, aoAbrirCompetencia }: TabelaDoPeriodoProps) {
  const colunas = estilos.periodo;
  return (
    <table role="table" className={estilos.grade}>
      <thead role="rowgroup" className={estilos.corpo}>
        <tr role="row" className={juntarClasses(estilos.cabecalho, colunas)}>
          {[
            'Competência',
            'Horas',
            'Custo fixo',
            'Variável',
            'Total',
            'Aportes',
            'Rendimentos',
            'Resultado',
            'Saldo final',
          ].map((titulo) => (
            <th role="columnheader" scope="col" key={titulo}>
              {titulo}
            </th>
          ))}
        </tr>
      </thead>
      <tbody role="rowgroup" className={estilos.corpo}>
        {(periodo.competencias ?? []).map((linha) => (
          <tr role="row" className={juntarClasses(estilos.linha, colunas)} key={linha.competencia}>
            <td role="cell" className={estilos.celula}>
              <BotaoDeLink aoClicar={() => aoAbrirCompetencia(linha.competencia ?? '')}>
                {competenciaCurta(linha.competencia)}
                <span className={estilos.apenasLeitor}>
                  {' '}
                  — abrir o fechamento de {competenciaPorExtenso(linha.competencia)}
                </span>
              </BotaoDeLink>
            </td>
            <Celulas linha={linha} />
          </tr>
        ))}
      </tbody>
      <tfoot role="rowgroup" className={estilos.corpo}>
        <tr role="row" className={juntarClasses(estilos.totais, colunas)}>
          <td role="cell" className={estilos.celula}>
            TOTAL DO PERÍODO
          </td>
          <Celulas linha={periodo.totais} />
        </tr>
      </tfoot>
    </table>
  );
}
