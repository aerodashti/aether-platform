import { FalhaDaConsulta } from '@/compartilhado/recorte/FalhaDaConsulta';
import { juntarClasses } from '@/design-system/classes';
import { Botao } from '@/design-system/primitivos/Botao';
import { Esqueleto } from '@/design-system/primitivos/Esqueleto';
import { PontoDeCor, type CorDeIdentificacao } from '@/design-system/primitivos/SeletorDeCor';
import { Texto } from '@/design-system/primitivos/Texto';

import {
  useConcluirTroca,
  useReabrirTroca,
  type SituacaoDaTroca,
  type TrocaResponse,
} from '../api/useTrocas';

import { dataCurta, horasEmTexto, kmEmTexto, moedaEmTexto } from './rotulos';
import estilos from './TabelaDeTrocas.module.css';

interface TabelaDeTrocasProps {
  trocas: TrocaResponse[] | undefined;
  situacao: SituacaoDaTroca;
  carregando: boolean;
  /** A falha da consulta: a recusa do filtro é dita como veio, com "Limpar filtros". */
  erro: Error | null;
  filtrada: boolean;
  podeGerir: boolean;
  aoEditar: (troca: TrocaResponse) => void;
  aoTentarDeNovo: () => void;
  aoLimparFiltros: () => void;
}

function Dono({ nome, cor }: { nome: string | undefined; cor: string | undefined }) {
  return (
    <>
      <PontoDeCor cor={(cor ?? 'CINZA') as CorDeIdentificacao} />
      <span className={estilos.trunca} title={nome}>
        {nome}
      </span>
    </>
  );
}

/**
 * As trocas de uma aba. Pendente se conclui (a devolução foi feita); realizada se reabre — para o
 * engano. Excluir não existe no protótipo: a correção é o Editar.
 */
export function TabelaDeTrocas({
  trocas,
  situacao,
  carregando,
  erro,
  filtrada,
  podeGerir,
  aoEditar,
  aoTentarDeNovo,
  aoLimparFiltros,
}: TabelaDeTrocasProps) {
  const concluir = useConcluirTroca();
  const reabrir = useReabrirTroca();

  if (erro) {
    return (
      <div className={estilos.recado} role="alert">
        <FalhaDaConsulta
          falha={erro}
          generica="Não foi possível carregar as trocas."
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
        <span className={estilos.apenasLeitor}>Carregando as trocas…</span>
      </div>
    );
  }
  if (!trocas || trocas.length === 0) {
    return (
      <div className={estilos.recado}>
        <Texto variante="corpo" como="p">
          {situacao === 'PENDENTE'
            ? `Nenhuma troca pendente${filtrada ? ' para este filtro' : ''} — tudo conciliado.`
            : `Nenhuma troca concluída${filtrada ? ' para este filtro' : ''}.`}
        </Texto>
      </div>
    );
  }

  return (
    <table role="table" className={estilos.grade}>
      <thead role="rowgroup" className={estilos.corpo}>
        <tr role="row" className={estilos.cabecalho}>
          <th role="columnheader" scope="col">
            Data
          </th>
          <th role="columnheader" scope="col">
            Aeronave
          </th>
          <th role="columnheader" scope="col">
            Cedeu
          </th>
          <th role="columnheader" scope="col">
            Recebeu
          </th>
          <th role="columnheader" scope="col" className={estilos.aDireita}>
            Horas
          </th>
          <th role="columnheader" scope="col" className={estilos.aDireita}>
            KM
          </th>
          <th role="columnheader" scope="col" className={estilos.aDireita}>
            R$ / hora
          </th>
          <th role="columnheader" scope="col">
            Observação
          </th>
          <th role="columnheader" scope="col" className={estilos.apenasLeitor}>
            Ações
          </th>
        </tr>
      </thead>
      <tbody role="rowgroup" className={estilos.corpo}>
        {trocas.map((troca) => {
          const id = troca.id ?? 0;
          const descricao = `troca de ${troca.nomeDoCedente ?? ''} para ${troca.nomeDoRecebedor ?? ''}`;
          return (
            <tr role="row" className={estilos.linha} key={id}>
              <td role="cell" className={estilos.celula}>
                <span className={estilos.dado}>{dataCurta(troca.data)}</span>
                {troca.concluidaEm ? (
                  <span className={estilos.sub}>
                    <span aria-hidden="true">↩ </span>
                    <span className={estilos.apenasLeitor}>devolvida em </span>
                    {dataCurta(troca.concluidaEm)}
                  </span>
                ) : null}
              </td>
              <td role="cell" className={estilos.celula}>
                <span className={estilos.matricula}>{troca.matricula}</span>
                <span className={estilos.sub}>{troca.modelo}</span>
              </td>
              <td role="cell" className={estilos.celula}>
                <span className={estilos.dono}>
                  <Dono nome={troca.nomeDoCedente} cor={troca.corDoCedente} />
                </span>
              </td>
              <td role="cell" className={estilos.celula}>
                <span className={estilos.dono}>
                  <span className={estilos.seta} aria-hidden="true">
                    →
                  </span>
                  <Dono nome={troca.nomeDoRecebedor} cor={troca.corDoRecebedor} />
                </span>
              </td>
              <td role="cell" className={estilos.celula}>
                <span className={estilos.numero}>{horasEmTexto(troca.horas)}</span>
              </td>
              <td role="cell" className={estilos.celula}>
                <span className={estilos.numero}>{kmEmTexto(troca.km)}</span>
              </td>
              <td role="cell" className={estilos.celula}>
                <span className={estilos.numero}>{moedaEmTexto(troca.valorPorHora)}</span>
                {troca.valorTotal != null ? (
                  <span className={juntarClasses(estilos.sub, estilos.aDireita)}>
                    total {moedaEmTexto(troca.valorTotal)}
                  </span>
                ) : null}
              </td>
              <td role="cell" className={estilos.celula}>
                <span className={estilos.observacao} title={troca.observacao}>
                  {[troca.relatorioDeVoo, troca.observacao].filter(Boolean).join(' · ') || '—'}
                </span>
              </td>
              <td role="cell" className={estilos.celula}>
                {podeGerir ? (
                  <span className={estilos.acoes}>
                    {situacao === 'PENDENTE' ? (
                      <Botao
                        tom="positivo"
                        tamanho="pequeno"
                        rotuloAcessivel={`Concluir ${descricao}`}
                        carregando={concluir.isPending && concluir.variables === id}
                        aoClicar={() => concluir.mutate(id)}
                      >
                        ✓ Concluir
                      </Botao>
                    ) : (
                      <Botao
                        variante="fantasma"
                        tamanho="pequeno"
                        rotuloAcessivel={`Reabrir ${descricao}`}
                        carregando={reabrir.isPending && reabrir.variables === id}
                        aoClicar={() => reabrir.mutate(id)}
                      >
                        Reabrir
                      </Botao>
                    )}
                    <Botao
                      variante="fantasma"
                      tamanho="pequeno"
                      rotuloAcessivel={`Editar ${descricao}`}
                      aoClicar={() => aoEditar(troca)}
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
  );
}
