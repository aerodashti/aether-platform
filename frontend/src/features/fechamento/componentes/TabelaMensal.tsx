import { juntarClasses } from '@/design-system/classes';
import { BotaoDeLink } from '@/design-system/primitivos/BotaoDeLink';
import { PontoDeCor, type CorDeIdentificacao } from '@/design-system/primitivos/SeletorDeCor';

import type { FechamentoMensalResponse, LinhaDoProprietario } from '../api/useFechamento';

import estilos from './Grade.module.css';
import { horasEmTexto, moedaEmTexto, percentualEmTexto } from './rotulos';

interface TabelaMensalProps {
  fechamento: FechamentoMensalResponse;
  aoAbrirExtrato: (linha: LinhaDoProprietario) => void;
}

function Saldo({ valor }: { valor: number | undefined }) {
  return (
    <span
      className={juntarClasses(estilos.numero, estilos.forte, (valor ?? 0) < 0 && estilos.devedor)}
    >
      {moedaEmTexto(valor)}
    </span>
  );
}

/** Uma linha por proprietário, com o TOTAL que fecha com os indicadores do mês. */
export function TabelaMensal({ fechamento, aoAbrirExtrato }: TabelaMensalProps) {
  const linhas = fechamento.linhas ?? [];
  const totais = fechamento.totais;
  const colunas = juntarClasses(estilos.mensal);

  return (
    <table role="table" className={estilos.grade}>
      <thead role="rowgroup" className={estilos.corpo}>
        <tr role="row" className={juntarClasses(estilos.cabecalho, colunas)}>
          <th role="columnheader" scope="col">
            Proprietário
          </th>
          <th role="columnheader" scope="col">
            Particip.
          </th>
          <th role="columnheader" scope="col">
            Horas
          </th>
          <th role="columnheader" scope="col">
            % uso
          </th>
          <th role="columnheader" scope="col">
            Custo fixo
          </th>
          <th role="columnheader" scope="col">
            Variável
          </th>
          <th role="columnheader" scope="col">
            Total mês
          </th>
          <th role="columnheader" scope="col">
            Aportes
          </th>
          <th role="columnheader" scope="col">
            Saldo acum.
          </th>
        </tr>
      </thead>
      <tbody role="rowgroup" className={estilos.corpo}>
        {linhas.map((linha) => (
          <tr
            role="row"
            className={juntarClasses(estilos.linha, colunas)}
            key={linha.proprietarioId}
          >
            <td role="cell" className={estilos.celula}>
              <span className={estilos.dono}>
                <PontoDeCor cor={(linha.corDeIdentificacao ?? 'CINZA') as CorDeIdentificacao} />
                <BotaoDeLink aoClicar={() => aoAbrirExtrato(linha)}>
                  {linha.nome}
                  <span className={estilos.apenasLeitor}> — abrir extrato</span>
                </BotaoDeLink>
              </span>
            </td>
            <td role="cell" className={estilos.celula}>
              <span className={estilos.numero}>{percentualEmTexto(linha.percentual)}</span>
            </td>
            <td role="cell" className={estilos.celula}>
              <span className={estilos.numero}>{horasEmTexto(linha.horas)}</span>
            </td>
            <td role="cell" className={estilos.celula}>
              <span className={juntarClasses(estilos.numero, estilos.suave)}>
                {percentualEmTexto(linha.percentualDeUso)}
              </span>
            </td>
            <td role="cell" className={estilos.celula}>
              <span className={estilos.numero}>{moedaEmTexto(linha.custoFixo)}</span>
            </td>
            <td role="cell" className={estilos.celula}>
              <span className={estilos.numero}>{moedaEmTexto(linha.custoVariavel)}</span>
            </td>
            <td role="cell" className={estilos.celula}>
              <span className={juntarClasses(estilos.numero, estilos.forte)}>
                {moedaEmTexto(linha.totalDoMes)}
              </span>
            </td>
            <td role="cell" className={estilos.celula}>
              <span className={estilos.numero}>{moedaEmTexto(linha.aportes)}</span>
            </td>
            <td role="cell" className={estilos.celula}>
              <Saldo valor={linha.saldoAcumulado} />
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot role="rowgroup" className={estilos.corpo}>
        <tr role="row" className={juntarClasses(estilos.totais, colunas)}>
          <td role="cell" className={estilos.celula}>
            TOTAL
          </td>
          <td role="cell" className={estilos.celula}>
            <span className={estilos.numero}>{percentualEmTexto(totais?.percentual)}</span>
          </td>
          <td role="cell" className={estilos.celula}>
            <span className={estilos.numero}>{horasEmTexto(totais?.horas)}</span>
          </td>
          <td role="cell" className={estilos.celula} />
          <td role="cell" className={estilos.celula}>
            <span className={estilos.numero}>{moedaEmTexto(totais?.custoFixo)}</span>
          </td>
          <td role="cell" className={estilos.celula}>
            <span className={estilos.numero}>{moedaEmTexto(totais?.custoVariavel)}</span>
          </td>
          <td role="cell" className={estilos.celula}>
            <span className={estilos.numero}>{moedaEmTexto(totais?.totalDoMes)}</span>
          </td>
          <td role="cell" className={estilos.celula}>
            <span className={estilos.numero}>{moedaEmTexto(totais?.aportes)}</span>
          </td>
          <td role="cell" className={estilos.celula}>
            <Saldo valor={totais?.saldoAcumulado} />
          </td>
        </tr>
      </tfoot>
    </table>
  );
}
