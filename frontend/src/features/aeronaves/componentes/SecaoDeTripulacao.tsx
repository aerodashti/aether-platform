import { useState } from 'react';

import { juntarClasses } from '@/design-system/classes';
import { Botao } from '@/design-system/primitivos/Botao';
import { Texto } from '@/design-system/primitivos/Texto';

import { useTripulantes, type TripulanteResponse } from '../api/useTripulantes';

import { PainelDeTripulante } from './PainelDeTripulante';
import { dataCurta, horasEmTexto, ROTULO_DA_FUNCAO } from './rotulos';
import estilos from './SecaoDeTripulacao.module.css';

interface SecaoDeTripulacaoProps {
  aeronaveId: number;
  podeGerir: boolean;
}

type Painel = { modo: 'novo' } | { modo: 'editar'; tripulante: TripulanteResponse } | null;

/**
 * A tripulação da aeronave, com CMA e CHT julgados pelo servidor: validade vencida sai em
 * crítico, não informada sai em travessão — são afirmações diferentes.
 */
export function SecaoDeTripulacao({ aeronaveId, podeGerir }: SecaoDeTripulacaoProps) {
  const consulta = useTripulantes(aeronaveId);
  const [painel, setPainel] = useState<Painel>(null);

  const itens = consulta.data ?? [];

  return (
    <section className={estilos.secao} aria-label="Tripulação">
      <div className={estilos.cabecalho}>
        <div>
          <Texto variante="legenda" tom="suave" como="h2">
            Tripulação
          </Texto>
          <Texto variante="apoio" tom="suave" como="p">
            Validades de CMA e habilitação (CHT).
          </Texto>
        </div>
        {podeGerir ? (
          <Botao
            variante="secundario"
            tamanho="pequeno"
            aoClicar={() => setPainel({ modo: 'novo' })}
          >
            Adicionar piloto
          </Botao>
        ) : null}
      </div>

      {consulta.isError ? (
        <div className={estilos.recado} role="alert">
          <Texto variante="corpo" como="p">
            Não foi possível carregar a tripulação.
          </Texto>
          <Botao variante="secundario" tamanho="pequeno" aoClicar={() => void consulta.refetch()}>
            Tentar de novo
          </Botao>
        </div>
      ) : itens.length === 0 && !consulta.isPending ? (
        <div className={estilos.recado}>
          <Texto variante="corpo" como="p">
            Nenhum piloto vinculado a esta aeronave.
          </Texto>
          <Texto variante="apoio" tom="suave" como="p">
            Vincule comandantes e copilotos para atribuir tripulação aos trechos.
          </Texto>
        </div>
      ) : (
        <table className={estilos.grade}>
          <thead className={estilos.corpo}>
            <tr className={estilos.linhaDeCabecalho}>
              <th scope="col">Piloto</th>
              <th scope="col">Função</th>
              <th scope="col">Validade CMA</th>
              <th scope="col">Validade CHT</th>
              <th scope="col">Horas</th>
              <th scope="col" className={estilos.apenasLeitor}>
                Ações
              </th>
            </tr>
          </thead>
          <tbody className={estilos.corpo}>
            {itens.map((tripulante) => {
              const inativo = tripulante.situacao === 'INATIVO';
              return (
                <tr className={estilos.linha} key={tripulante.id}>
                  <td className={estilos.celula}>
                    <span className={estilos.nomes}>
                      <span className={estilos.nome}>
                        <span className={estilos.trunca}>{tripulante.nome}</span>
                        {inativo ? <span className={estilos.etiqueta}>Inativo</span> : null}
                      </span>
                      {tripulante.canac ? (
                        <span className={estilos.canac}>CANAC {tripulante.canac}</span>
                      ) : null}
                    </span>
                  </td>
                  <td className={estilos.celula}>
                    <span className={estilos.funcao}>
                      {tripulante.funcao ? ROTULO_DA_FUNCAO[tripulante.funcao] : '—'}
                    </span>
                  </td>
                  <td className={estilos.celula}>
                    <Validade data={tripulante.validadeCma} vencida={tripulante.cmaVencido} />
                  </td>
                  <td className={estilos.celula}>
                    <Validade data={tripulante.validadeCht} vencida={tripulante.chtVencido} />
                  </td>
                  <td className={estilos.celula}>
                    <span className={estilos.horas}>{horasEmTexto(tripulante.horasTotais)}</span>
                  </td>
                  <td className={estilos.celula}>
                    {podeGerir ? (
                      <span className={estilos.acoes}>
                        <Botao
                          variante="fantasma"
                          tamanho="pequeno"
                          aoClicar={() => setPainel({ modo: 'editar', tripulante })}
                        >
                          Editar
                        </Botao>
                      </span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {painel ? (
        <PainelDeTripulante
          key={painel.modo === 'editar' ? painel.tripulante.id : 'novo'}
          aeronaveId={aeronaveId}
          tripulante={painel.modo === 'editar' ? painel.tripulante : undefined}
          aoFechar={() => setPainel(null)}
        />
      ) : null}
    </section>
  );
}

/** Vencida em crítico com a palavra, porque cor sozinha não é informação. */
function Validade({ data, vencida }: { data: string | undefined; vencida: boolean | undefined }) {
  return (
    <span className={juntarClasses(estilos.validade, vencida && estilos.vencida)}>
      {dataCurta(data)}
      {vencida ? ' · vencida' : ''}
    </span>
  );
}
