import { useState } from 'react';

import { FalhaDaConsulta } from '@/compartilhado/recorte/FalhaDaConsulta';
import { juntarClasses } from '@/design-system/classes';
import { Esqueleto } from '@/design-system/primitivos/Esqueleto';
import { Texto } from '@/design-system/primitivos/Texto';

import {
  useExcluirRendimento,
  type RendimentoResponse,
  type RendimentosResponse,
} from '../api/useAportes';

import { AcoesDaLinha } from './AcoesDaLinha';
import estilos from './Grade.module.css';
import { competenciaEmTexto, dataCurta, moedaEmTexto, taxaEmTexto } from './rotulos';

interface TabelaDeRendimentosProps {
  resposta: RendimentosResponse | undefined;
  carregando: boolean;
  /** A falha da consulta, ou o recorte que a tela já sabe inválido. */
  erro: Error | null;
  mostraAeronave: boolean;
  podeGerir: boolean;
  aoCorrigir: (rendimento: RendimentoResponse) => void;
  aoTentarDeNovo: () => void;
  aoLimparFiltros: () => void;
}

/** Os rendimentos do recorte. Saldo aplicado e taxa são o extrato; o que conta é o rendimento. */
export function TabelaDeRendimentos({
  resposta,
  carregando,
  erro,
  mostraAeronave,
  podeGerir,
  aoCorrigir,
  aoTentarDeNovo,
  aoLimparFiltros,
}: TabelaDeRendimentosProps) {
  const excluir = useExcluirRendimento();
  const [confirmando, setConfirmando] = useState<number | null>(null);
  const linha = juntarClasses(estilos.rendimentos, mostraAeronave && estilos.comAeronave);

  if (erro) {
    return (
      <div className={estilos.recado} role="alert">
        <FalhaDaConsulta
          falha={erro}
          generica="Não foi possível carregar os rendimentos."
          aoTentarDeNovo={aoTentarDeNovo}
          aoLimpar={aoLimparFiltros}
        />
      </div>
    );
  }

  if (carregando) {
    return (
      <div className={estilos.recado} role="status">
        <Esqueleto />
        <span className={estilos.apenasLeitor}>Carregando os rendimentos…</span>
      </div>
    );
  }

  const rendimentos = resposta?.rendimentos ?? [];
  if (rendimentos.length === 0) {
    return (
      <div className={estilos.recado}>
        <Texto variante="corpo" como="p">
          Nenhum rendimento registrado no período selecionado.
        </Texto>
      </div>
    );
  }

  return (
    <table role="table" className={estilos.grade}>
      <thead role="rowgroup" className={estilos.corpo}>
        <tr role="row" className={juntarClasses(estilos.cabecalho, linha)}>
          <th role="columnheader" scope="col">
            Crédito
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
            Aplicação
          </th>
          <th role="columnheader" scope="col" className={estilos.aDireita}>
            Saldo aplicado
          </th>
          <th role="columnheader" scope="col" className={estilos.aDireita}>
            Taxa
          </th>
          <th role="columnheader" scope="col" className={estilos.aDireita}>
            Rendimento
          </th>
          <th role="columnheader" scope="col" className={estilos.apenasLeitor}>
            Ações
          </th>
        </tr>
      </thead>
      <tbody role="rowgroup" className={estilos.corpo}>
        {rendimentos.map((rendimento) => {
          const id = rendimento.id ?? 0;
          const descricao = `rendimento de ${dataCurta(rendimento.data)}`;
          return (
            <tr role="row" className={juntarClasses(estilos.linha, linha)} key={id}>
              <td role="cell" className={estilos.celula}>
                <span className={estilos.dado}>{dataCurta(rendimento.data)}</span>
              </td>
              <td role="cell" className={estilos.celula}>
                <span className={estilos.dado}>{competenciaEmTexto(rendimento.competencia)}</span>
              </td>
              {mostraAeronave ? (
                <td role="cell" className={estilos.celula}>
                  <span className={estilos.identificador}>{rendimento.matricula}</span>
                </td>
              ) : null}
              <td role="cell" className={estilos.celula}>
                <span className={estilos.texto}>{rendimento.aplicacao}</span>
              </td>
              <td role="cell" className={estilos.celula}>
                <span className={estilos.numero}>{moedaEmTexto(rendimento.saldoAplicado)}</span>
              </td>
              <td role="cell" className={estilos.celula}>
                <span className={estilos.numero}>{taxaEmTexto(rendimento.taxa)}</span>
              </td>
              <td role="cell" className={estilos.celula}>
                <span className={juntarClasses(estilos.numero, estilos.forte)}>
                  {moedaEmTexto(rendimento.valor)}
                </span>
              </td>
              <td role="cell" className={estilos.celula}>
                {podeGerir ? (
                  <AcoesDaLinha
                    descricao={descricao}
                    confirmando={confirmando === id}
                    excluindo={excluir.isPending}
                    aoEditar={() => aoCorrigir(rendimento)}
                    aoPedirExclusao={() => setConfirmando(id)}
                    aoConfirmar={() =>
                      excluir.mutate(id, { onSettled: () => setConfirmando(null) })
                    }
                    aoDesistir={() => setConfirmando(null)}
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
          <td role="cell" className={estilos.celula} />
          <td role="cell" className={estilos.celula} />
          <td role="cell" className={estilos.celula} />
          <td role="cell" className={estilos.celula}>
            <span className={estilos.numero}>{moedaEmTexto(resposta?.total)}</span>
          </td>
          <td role="cell" className={estilos.celula} />
        </tr>
      </tfoot>
    </table>
  );
}
