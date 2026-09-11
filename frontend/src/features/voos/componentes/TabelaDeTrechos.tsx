import { useState } from 'react';

import { Botao } from '@/design-system/primitivos/Botao';
import { Esqueleto } from '@/design-system/primitivos/Esqueleto';
import { PontoDeCor, type CorDeIdentificacao } from '@/design-system/primitivos/SeletorDeCor';
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
        <table className={estilos.grade}>
          <Cabecalho mostraAeronave={mostraAeronave} />
          <tbody className={estilos.corpo}>
            {Array.from({ length: LINHAS_DO_ESQUELETO }, (_, indice) => (
              <tr className={estilos.linha} key={indice} aria-hidden="true">
                {Array.from({ length: 5 }, (_, celula) => (
                  <td className={estilos.celula} key={celula}>
                    <Esqueleto />
                  </td>
                ))}
                <td className={estilos.celula} />
                <td className={estilos.celula} />
                <td className={estilos.celula} />
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
    <table className={estilos.grade}>
      <Cabecalho mostraAeronave={mostraAeronave} />
      <tbody className={estilos.corpo}>
        {trechos.map((trecho) => {
          const id = trecho.id ?? 0;
          return (
            <tr className={estilos.linha} key={id}>
              <td className={estilos.celula}>
                <span className={estilos.identificador}>
                  {trecho.relatorioDeVoo}
                  <span className={estilos.numeroDoTrecho}> · {trecho.numeroDoTrecho}</span>
                </span>
                {mostraAeronave ? (
                  <span className={estilos.subIdentificador}>{trecho.matricula}</span>
                ) : null}
              </td>
              <td className={estilos.celula}>
                <span className={estilos.dado}>{dataCurta(trecho.data)}</span>
              </td>
              <td className={estilos.celula}>
                <span className={estilos.identificador}>{trecho.origem}</span>
              </td>
              <td className={estilos.celula}>
                <span className={estilos.identificador}>{trecho.destino}</span>
              </td>
              <td className={estilos.celula}>
                <span className={estilos.numero}>{horasEmTexto(trecho.horas)}</span>
              </td>
              <td className={estilos.celula}>
                <span className={estilos.numero}>{kmEmTexto(trecho.km)}</span>
              </td>
              <td className={estilos.celula}>
                <span className={estilos.atribuicao}>
                  {trecho.vooDeManutencao ? (
                    <span className={estilos.manutencao}>{ATRIBUICAO_DE_MANUTENCAO}</span>
                  ) : (
                    <>
                      <PontoDeCor
                        cor={(trecho.corDeIdentificacao ?? 'CINZA') as CorDeIdentificacao}
                      />
                      <span className={estilos.trunca}>{trecho.nomeDoProprietario}</span>
                    </>
                  )}
                </span>
              </td>
              <td className={estilos.celula}>
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
      <tfoot className={estilos.corpo}>
        <tr className={estilos.totais}>
          <td className={estilos.celula}>TOTAIS</td>
          <td className={estilos.celula} />
          <td className={estilos.celula} />
          <td className={estilos.celula} />
          <td className={estilos.celula}>
            <span className={estilos.numero}>{horasEmTexto(diario?.totais?.horas)}</span>
          </td>
          <td className={estilos.celula}>
            <span className={estilos.numero}>{kmEmTexto(diario?.totais?.km)}</span>
          </td>
          <td className={estilos.celula}>
            <span className={estilos.dado}>
              {diario?.totais?.pousos ?? 0}{' '}
              {(diario?.totais?.pousos ?? 0) === 1 ? 'pouso' : 'pousos'}
            </span>
          </td>
          <td className={estilos.celula} />
        </tr>
      </tfoot>
    </table>
  );
}

function Cabecalho({ mostraAeronave }: { mostraAeronave: boolean }) {
  return (
    <thead className={estilos.corpo}>
      <tr className={estilos.cabecalho}>
        <th scope="col">{mostraAeronave ? 'Rel. voo · aeronave' : 'Rel. voo'}</th>
        <th scope="col">Data</th>
        <th scope="col">Origem</th>
        <th scope="col">Destino</th>
        <th scope="col" className={estilos.aDireita}>
          Horas
        </th>
        <th scope="col" className={estilos.aDireita}>
          KM
        </th>
        <th scope="col">Atribuição</th>
        <th scope="col" className={estilos.apenasLeitor}>
          Ações
        </th>
      </tr>
    </thead>
  );
}
