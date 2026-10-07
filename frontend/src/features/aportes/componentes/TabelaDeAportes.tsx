import type { ReactNode } from 'react';

import { FalhaDaConsulta } from '@/compartilhado/recorte/FalhaDaConsulta';
import { juntarClasses } from '@/design-system/classes';
import { Esqueleto } from '@/design-system/primitivos/Esqueleto';
import { PontoDeCor, type CorDeIdentificacao } from '@/design-system/primitivos/SeletorDeCor';
import { Texto } from '@/design-system/primitivos/Texto';

import { useExcluirAporte, type AportesResponse, type AporteResponse } from '../api/useAportes';
import { useExclusaoNaGrade } from '../hooks/useExclusaoNaGrade';

import { AcoesDaLinha } from './AcoesDaLinha';
import { FalhaDaExclusao } from './FalhaDaExclusao';
import estilos from './Grade.module.css';
import { competenciaEmTexto, dataCurta, moedaEmTexto } from './rotulos';

interface TabelaDeAportesProps {
  resposta: AportesResponse | undefined;
  carregando: boolean;
  /** A falha da consulta, ou o recorte que a tela já sabe inválido. */
  erro: Error | null;
  mostraAeronave: boolean;
  podeGerir: boolean;
  aoCorrigir: (aporte: AporteResponse) => void;
  aoTentarDeNovo: () => void;
  aoLimparFiltros: () => void;
}

/** Os aportes do recorte, com a linha de TOTAL somada no servidor. */
export function TabelaDeAportes({
  resposta,
  carregando,
  erro,
  mostraAeronave,
  podeGerir,
  aoCorrigir,
  aoTentarDeNovo,
  aoLimparFiltros,
}: TabelaDeAportesProps) {
  const exclusao = useExclusaoNaGrade(useExcluirAporte());
  const linha = juntarClasses(estilos.aportes, mostraAeronave && estilos.comAeronave);
  // A falha fica no mesmo lugar em todo estado da grade: se a linha excluída era a última, ela some
  // e a grade vira o recado de vazio, mas o aviso continua.
  const comFalha = (conteudo: ReactNode) => (
    <>
      <FalhaDaExclusao falha={exclusao.falha} />
      {conteudo}
    </>
  );

  if (erro) {
    return comFalha(
      <div className={estilos.recado} role="alert">
        <FalhaDaConsulta
          falha={erro}
          generica="Não foi possível carregar os aportes."
          aoTentarDeNovo={aoTentarDeNovo}
          aoLimpar={aoLimparFiltros}
        />
      </div>,
    );
  }

  if (carregando) {
    return comFalha(
      <>
        <div role="status" className={estilos.apenasLeitor}>
          Carregando os aportes…
        </div>
        <table role="table" className={estilos.grade}>
          <tbody role="rowgroup" className={estilos.corpo}>
            {Array.from({ length: 4 }, (_, indice) => (
              <tr
                role="row"
                className={juntarClasses(estilos.linha, linha)}
                key={indice}
                aria-hidden="true"
              >
                {Array.from({ length: mostraAeronave ? 6 : 5 }, (_, celula) => (
                  <td role="cell" className={estilos.celula} key={celula}>
                    <Esqueleto />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </>,
    );
  }

  const aportes = resposta?.aportes ?? [];
  if (aportes.length === 0) {
    return comFalha(
      <div className={estilos.recado}>
        <Texto variante="corpo" como="p">
          Nenhum aporte registrado no período selecionado.
        </Texto>
        <Texto variante="apoio" tom="suave" como="p">
          Amplie o período ou registre o aporte que acabou de cair na conta.
        </Texto>
      </div>,
    );
  }

  return comFalha(
    <table role="table" className={estilos.grade}>
      <thead role="rowgroup" className={estilos.corpo}>
        <tr role="row" className={juntarClasses(estilos.cabecalho, linha)}>
          <th role="columnheader" scope="col">
            Data
          </th>
          <th role="columnheader" scope="col">
            Competência
          </th>
          {mostraAeronave ? (
            <th role="columnheader" scope="col">
              Aeronave
            </th>
          ) : null}
          <th role="columnheader" scope="col">
            Proprietário
          </th>
          <th role="columnheader" scope="col" className={estilos.aDireita}>
            Valor
          </th>
          <th role="columnheader" scope="col" className={estilos.apenasLeitor}>
            Ações
          </th>
        </tr>
      </thead>
      <tbody role="rowgroup" className={estilos.corpo}>
        {aportes.map((aporte) => {
          const id = aporte.id ?? 0;
          const descricao = `aporte de ${aporte.nomeDoProprietario ?? ''} em ${dataCurta(aporte.data)}`;
          return (
            <tr role="row" className={juntarClasses(estilos.linha, linha)} key={id}>
              <td role="cell" className={estilos.celula}>
                <span className={estilos.dado}>{dataCurta(aporte.data)}</span>
              </td>
              <td role="cell" className={estilos.celula}>
                <span className={estilos.dado}>{competenciaEmTexto(aporte.competencia)}</span>
              </td>
              {mostraAeronave ? (
                <td role="cell" className={estilos.celula}>
                  <span className={estilos.identificador}>{aporte.matricula}</span>
                </td>
              ) : null}
              <td role="cell" className={estilos.celula}>
                <span className={estilos.dono}>
                  <PontoDeCor cor={(aporte.corDeIdentificacao ?? 'CINZA') as CorDeIdentificacao} />
                  <span className={estilos.trunca}>{aporte.nomeDoProprietario}</span>
                </span>
              </td>
              <td role="cell" className={estilos.celula}>
                <span className={estilos.numero}>{moedaEmTexto(aporte.valor)}</span>
              </td>
              <td role="cell" className={estilos.celula}>
                {podeGerir ? (
                  <AcoesDaLinha
                    descricao={descricao}
                    confirmando={exclusao.confirmando === id}
                    excluindo={exclusao.excluindo}
                    aoEditar={() => aoCorrigir(aporte)}
                    aoPedirExclusao={() => exclusao.pedir(id)}
                    aoConfirmar={() => exclusao.confirmar(id, descricao)}
                    aoDesistir={exclusao.desistir}
                  />
                ) : null}
              </td>
            </tr>
          );
        })}
      </tbody>
      <tfoot role="rowgroup" className={estilos.corpo}>
        <tr role="row" className={juntarClasses(estilos.totais, linha)}>
          <td role="cell" className={estilos.celula}>
            TOTAL
          </td>
          <td role="cell" className={estilos.celula} />
          {mostraAeronave ? <td role="cell" className={estilos.celula} /> : null}
          <td role="cell" className={estilos.celula}>
            <span className={estilos.dado}>
              {aportes.length} {aportes.length === 1 ? 'aporte' : 'aportes'}
            </span>
          </td>
          <td role="cell" className={estilos.celula}>
            <span className={estilos.numero}>{moedaEmTexto(resposta?.total)}</span>
          </td>
          <td role="cell" className={estilos.celula} />
        </tr>
      </tfoot>
    </table>,
  );
}
