import { useState } from 'react';

import { juntarClasses } from '@/design-system/classes';
import { Botao } from '@/design-system/primitivos/Botao';
import { Esqueleto } from '@/design-system/primitivos/Esqueleto';
import { CLASSE_DA_COR, type CorDeIdentificacao } from '@/design-system/primitivos/SeletorDeCor';
import { Texto } from '@/design-system/primitivos/Texto';

import { useExcluirTrecho, type DiarioDeVoosResponse, type TrechoResponse } from '../api/useVoos';

import { ATRIBUICAO_DE_MANUTENCAO, dataCurta, horasEmTexto, kmEmTexto } from './rotulos';
import estilos from './TabelaDeTrechos.module.css';

interface TabelaDeTrechosProps {
  diario: DiarioDeVoosResponse | undefined;
  carregando: boolean;
  erro: boolean;
  mostraAeronave: boolean;
  podeLancar: boolean;
  aoCorrigir: (trecho: TrechoResponse) => void;
  aoTentarDeNovo: () => void;
}

const LINHAS_DO_ESQUELETO = 4;

/**
 * A grade do diário, com a linha de TOTAIS somada no servidor. A exclusão pede confirmação na
 * própria linha — "Excluir?" — como no protótipo: modal para isso seria cerimônia.
 */
export function TabelaDeTrechos({
  diario,
  carregando,
  erro,
  mostraAeronave,
  podeLancar,
  aoCorrigir,
  aoTentarDeNovo,
}: TabelaDeTrechosProps) {
  const excluir = useExcluirTrecho();
  const [confirmando, setConfirmando] = useState<number | null>(null);

  if (erro) {
    return (
      <div className={estilos.recado} role="alert">
        <Texto variante="corpo" como="p">
          Não foi possível carregar o diário.
        </Texto>
        <Botao variante="secundario" tamanho="pequeno" aoClicar={aoTentarDeNovo}>
          Tentar de novo
        </Botao>
      </div>
    );
  }

  if (carregando) {
    return (
      <>
        <div role="status" className={estilos.apenasLeitor}>
          Carregando o diário…
        </div>
        <table role="table" className={estilos.grade}>
          <Cabecalho mostraAeronave={mostraAeronave} />
          <tbody role="rowgroup" className={estilos.corpo}>
            {Array.from({ length: LINHAS_DO_ESQUELETO }, (_, indice) => (
              <tr role="row" className={estilos.linha} key={indice} aria-hidden="true">
                {Array.from({ length: 5 }, (_, celula) => (
                  <td role="cell" className={estilos.celula} key={celula}>
                    <Esqueleto />
                  </td>
                ))}
                <td role="cell" className={estilos.celula} />
                <td role="cell" className={estilos.celula} />
                <td role="cell" className={estilos.celula} />
              </tr>
            ))}
          </tbody>
        </table>
      </>
    );
  }

  const trechos = diario?.trechos ?? [];
  if (trechos.length === 0) {
    return (
      <div className={estilos.recado}>
        <Texto variante="corpo" como="p">
          Nenhum trecho lançado neste recorte
        </Texto>
        <Texto variante="apoio" tom="suave" como="p">
          Amplie o recorte de competência ou use o botão "Registrar trecho" no topo.
        </Texto>
      </div>
    );
  }

  return (
    <table role="table" className={estilos.grade}>
      <Cabecalho mostraAeronave={mostraAeronave} />
      <tbody role="rowgroup" className={estilos.corpo}>
        {trechos.map((trecho) => {
          const id = trecho.id ?? 0;
          return (
            <tr role="row" className={estilos.linha} key={id}>
              <td role="cell" className={estilos.celula}>
                <span className={estilos.identificador}>
                  {trecho.relatorioDeVoo}
                  <span className={estilos.numeroDoTrecho}> · {trecho.numeroDoTrecho}</span>
                </span>
                {mostraAeronave ? (
                  <span className={estilos.subIdentificador}>{trecho.matricula}</span>
                ) : null}
              </td>
              <td role="cell" className={estilos.celula}>
                <span className={estilos.dado}>{dataCurta(trecho.data)}</span>
              </td>
              <td role="cell" className={estilos.celula}>
                <span className={estilos.identificador}>{trecho.origem}</span>
              </td>
              <td role="cell" className={estilos.celula}>
                <span className={estilos.identificador}>{trecho.destino}</span>
              </td>
              <td role="cell" className={estilos.celula}>
                <span className={estilos.numero}>{horasEmTexto(trecho.horas)}</span>
              </td>
              <td role="cell" className={estilos.celula}>
                <span className={estilos.numero}>{kmEmTexto(trecho.km)}</span>
              </td>
              <td role="cell" className={estilos.celula}>
                <span className={estilos.atribuicao}>
                  {trecho.vooDeManutencao ? (
                    <span className={estilos.manutencao}>{ATRIBUICAO_DE_MANUTENCAO}</span>
                  ) : (
                    <span
                      className={juntarClasses(
                        estilos.etiquetaDoDono,
                        CLASSE_DA_COR[(trecho.corDeIdentificacao ?? 'CINZA') as CorDeIdentificacao],
                      )}
                    >
                      {trecho.nomeDoProprietario}
                    </span>
                  )}
                </span>
              </td>
              <td role="cell" className={estilos.celula}>
                {podeLancar ? (
                  <span className={estilos.acoes}>
                    {confirmando === id ? (
                      <>
                        <Texto variante="apoio" tom="critico" como="span">
                          Excluir?
                        </Texto>
                        <Botao
                          variante="fantasma"
                          tamanho="pequeno"
                          tom="critico"
                          carregando={excluir.isPending}
                          aoClicar={() =>
                            excluir.mutate(id, { onSettled: () => setConfirmando(null) })
                          }
                        >
                          Sim
                        </Botao>
                        <Botao
                          variante="fantasma"
                          tamanho="pequeno"
                          aoClicar={() => setConfirmando(null)}
                        >
                          Não
                        </Botao>
                      </>
                    ) : (
                      <>
                        <Botao
                          variante="fantasma"
                          tamanho="pequeno"
                          aoClicar={() => aoCorrigir(trecho)}
                        >
                          Editar
                        </Botao>
                        <Botao
                          variante="fantasma"
                          tamanho="pequeno"
                          tom="critico"
                          aoClicar={() => setConfirmando(id)}
                        >
                          Excluir
                        </Botao>
                      </>
                    )}
                  </span>
                ) : null}
              </td>
            </tr>
          );
        })}
      </tbody>
      <tfoot role="rowgroup" className={estilos.corpo}>
        <tr role="row" className={estilos.totais}>
          <td role="cell" className={estilos.celula}>
            TOTAIS · {diario?.totais?.pousos ?? 0}{' '}
            {(diario?.totais?.pousos ?? 0) === 1 ? 'pouso' : 'pousos'}
          </td>
          <td role="cell" className={estilos.celula} />
          <td role="cell" className={estilos.celula} />
          <td role="cell" className={estilos.celula} />
          <td role="cell" className={estilos.celula}>
            <span className={estilos.numero}>{horasEmTexto(diario?.totais?.horas)}</span>
          </td>
          <td role="cell" className={estilos.celula}>
            <span className={estilos.numero}>{kmEmTexto(diario?.totais?.km)}</span>
          </td>
          <td role="cell" className={estilos.celula} />
          <td role="cell" className={estilos.celula} />
        </tr>
      </tfoot>
    </table>
  );
}

function Cabecalho({ mostraAeronave }: { mostraAeronave: boolean }) {
  return (
    <thead role="rowgroup" className={estilos.corpo}>
      <tr role="row" className={estilos.cabecalho}>
        <th role="columnheader" scope="col">
          {mostraAeronave ? 'Rel. voo · aeronave' : 'Rel. voo'}
        </th>
        <th role="columnheader" scope="col">
          Data
        </th>
        <th role="columnheader" scope="col">
          Origem
        </th>
        <th role="columnheader" scope="col">
          Destino
        </th>
        <th role="columnheader" scope="col" className={estilos.aDireita}>
          Horas
        </th>
        <th role="columnheader" scope="col" className={estilos.aDireita}>
          KM
        </th>
        <th role="columnheader" scope="col">
          Atribuição
        </th>
        <th role="columnheader" scope="col" className={estilos.apenasLeitor}>
          Ações
        </th>
      </tr>
    </thead>
  );
}
