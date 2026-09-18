import { useState } from 'react';

import { juntarClasses } from '@/design-system/classes';
import { Botao } from '@/design-system/primitivos/Botao';
import { Esqueleto } from '@/design-system/primitivos/Esqueleto';
import { Texto } from '@/design-system/primitivos/Texto';

import { useTripulantes, type TripulanteResponse } from '../api/useTripulantes';

import { CartaoDeSecao } from './CartaoDeSecao';
import { PainelDeTripulante } from './PainelDeTripulante';
import { dataCurta, horasEmTexto, prazoDaValidade, ROTULO_DA_FUNCAO } from './rotulos';
import estilos from './SecaoDeTripulacao.module.css';

interface SecaoDeTripulacaoProps {
  aeronaveId: number;
  podeGerir: boolean;
}

type Painel = { modo: 'novo' } | { modo: 'editar'; tripulante: TripulanteResponse } | null;

function contagemDeTripulantes(total: number): string {
  if (total === 0) {
    return 'Nenhum tripulante';
  }
  return total === 1 ? '1 tripulante' : `${total} tripulantes`;
}

/**
 * A tripulação da aeronave, na tabela do protótipo: nome com CANAC e contato na sublinha, função,
 * validades de CMA e CHT com o prazo embaixo, horas e a ação. Validade vencida sai em crítico com
 * a palavra — o julgamento é do servidor; aqui só se escreve o prazo.
 */
export function SecaoDeTripulacao({ aeronaveId, podeGerir }: SecaoDeTripulacaoProps) {
  const consulta = useTripulantes(aeronaveId);
  const [painel, setPainel] = useState<Painel>(null);

  const itens = consulta.data ?? [];
  const contagem = consulta.isSuccess ? `${contagemDeTripulantes(itens.length)} · ` : '';

  return (
    <CartaoDeSecao
      titulo="Tripulação"
      apoio={`${contagem}validades de CMA e habilitação (CHT)`}
      acao={
        podeGerir ? (
          <Botao variante="contorno" tamanho="medio" aoClicar={() => setPainel({ modo: 'novo' })}>
            Adicionar tripulante
          </Botao>
        ) : null
      }
    >
      {consulta.isPending ? (
        <div className={estilos.vazio}>
          <div role="status" className={estilos.apenasLeitor}>
            Carregando a tripulação…
          </div>
          <Esqueleto />
        </div>
      ) : consulta.isError ? (
        <div className={estilos.recado} role="alert">
          <Texto variante="corpo" como="p">
            Não foi possível carregar a tripulação.
          </Texto>
          <Botao variante="secundario" tamanho="pequeno" aoClicar={() => void consulta.refetch()}>
            Tentar de novo
          </Botao>
        </div>
      ) : itens.length === 0 ? (
        <div className={estilos.vazio}>Nenhum tripulante vinculado a esta aeronave.</div>
      ) : (
        <div className={estilos.rolagem}>
          <table className={juntarClasses(estilos.tabela, !podeGerir && estilos.semAcoes)}>
            <thead className={estilos.bloco}>
              <tr className={estilos.linhaDeCabecalho}>
                <th scope="col">Tripulante</th>
                <th scope="col">Função</th>
                <th scope="col">Validade CMA</th>
                <th scope="col">Validade CHT</th>
                <th scope="col" className={estilos.direita}>
                  Horas
                </th>
                {podeGerir ? (
                  <th scope="col" className={estilos.apenasLeitor}>
                    Ações
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody className={estilos.bloco}>
              {itens.map((tripulante) => {
                const inativo = tripulante.situacao === 'INATIVO';
                const sublinha = [
                  tripulante.canac ? `CANAC ${tripulante.canac}` : null,
                  tripulante.telefone,
                  tripulante.email,
                ]
                  .filter(Boolean)
                  .join(' · ');
                return (
                  <tr className={estilos.linha} key={tripulante.id}>
                    <td className={estilos.celula}>
                      <span className={estilos.nomes}>
                        <span className={estilos.nome}>
                          <span className={estilos.trunca}>{tripulante.nome}</span>
                          {inativo ? <span className={estilos.etiqueta}>Inativo</span> : null}
                        </span>
                        {sublinha ? <span className={estilos.sublinha}>{sublinha}</span> : null}
                      </span>
                    </td>
                    <td className={estilos.celula}>
                      <span className={estilos.forte}>
                        {tripulante.funcao ? ROTULO_DA_FUNCAO[tripulante.funcao] : '—'}
                      </span>
                    </td>
                    <td className={estilos.celula}>
                      <Validade data={tripulante.validadeCma} vencida={tripulante.cmaVencido} />
                    </td>
                    <td className={estilos.celula}>
                      <Validade data={tripulante.validadeCht} vencida={tripulante.chtVencido} />
                    </td>
                    <td className={juntarClasses(estilos.celula, estilos.direita)}>
                      <span className={estilos.forte}>{horasEmTexto(tripulante.horasTotais)}</span>
                    </td>
                    {podeGerir ? (
                      <td className={juntarClasses(estilos.celula, estilos.acoes)}>
                        <Botao
                          variante="fantasma"
                          tamanho="pequeno"
                          aoClicar={() => setPainel({ modo: 'editar', tripulante })}
                        >
                          Editar
                        </Botao>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {painel ? (
        <PainelDeTripulante
          key={painel.modo === 'editar' ? painel.tripulante.id : 'novo'}
          aeronaveId={aeronaveId}
          tripulante={painel.modo === 'editar' ? painel.tripulante : undefined}
          aoFechar={() => setPainel(null)}
        />
      ) : null}
    </CartaoDeSecao>
  );
}

/** A data em cima e o prazo embaixo; vencida em crítico com a palavra, porque cor sozinha não informa. */
function Validade({ data, vencida }: { data: string | undefined; vencida: boolean | undefined }) {
  const prazo = prazoDaValidade(data, vencida);
  return (
    <span className={juntarClasses(estilos.validade, vencida && estilos.vencida)}>
      <span className={estilos.forte}>{dataCurta(data)}</span>
      {prazo ? <span className={estilos.sublinha}>{prazo}</span> : null}
    </span>
  );
}
