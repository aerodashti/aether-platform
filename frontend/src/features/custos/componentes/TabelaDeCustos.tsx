import { useState } from 'react';

import { Botao } from '@/design-system/primitivos/Botao';
import { Esqueleto } from '@/design-system/primitivos/Esqueleto';
import { PontoDeCor, type CorDeIdentificacao } from '@/design-system/primitivos/SeletorDeCor';
import { Texto } from '@/design-system/primitivos/Texto';

import { useExcluirCusto, type CustoResponse, type LancamentosResponse } from '../api/useCustos';

import { ATRIBUICAO_RATEADA, CATEGORIAS, dataCurta, moedaEmTexto, ROTULO_DO_TIPO } from './rotulos';
import estilos from './TabelaDeCustos.module.css';

interface TabelaDeCustosProps {
  lancamentos: LancamentosResponse | undefined;
  carregando: boolean;
  erro: boolean;
  podeGerir: boolean;
  aoCorrigir: (custo: CustoResponse) => void;
  aoTentarDeNovo: () => void;
  aoLimparFiltros: () => void;
}

const LINHAS_DO_ESQUELETO = 4;

/** A grade dos lançamentos, com o TOTAL separado em fixos e variáveis — somado no servidor. */
export function TabelaDeCustos({
  lancamentos,
  carregando,
  erro,
  podeGerir,
  aoCorrigir,
  aoTentarDeNovo,
  aoLimparFiltros,
}: TabelaDeCustosProps) {
  const excluir = useExcluirCusto();
  const [confirmando, setConfirmando] = useState<number | null>(null);

  if (erro) {
    return (
      <div className={estilos.recado} role="alert">
        <Texto variante="corpo" como="p">
          Não foi possível carregar os lançamentos.
        </Texto>
        <Texto variante="apoio" tom="suave" como="p">
          Nenhum lançamento foi perdido.
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
          Carregando lançamentos…
        </div>
        <table className={estilos.grade}>
          <Cabecalho />
          <tbody className={estilos.corpo}>
            {Array.from({ length: LINHAS_DO_ESQUELETO }, (_, indice) => (
              <tr className={estilos.linha} key={indice} aria-hidden="true">
                {Array.from({ length: 6 }, (_, celula) => (
                  <td className={estilos.celula} key={celula}>
                    <Esqueleto />
                  </td>
                ))}
                <td className={estilos.celula} />
                <td className={estilos.celula} />
              </tr>
            ))}
          </tbody>
        </table>
      </>
    );
  }

  const custos = lancamentos?.custos ?? [];
  if (custos.length === 0) {
    return (
      <div className={estilos.recado}>
        <Texto variante="corpo" como="p">
          Nenhum lançamento encontrado
        </Texto>
        <Texto variante="apoio" tom="suave" como="p">
          Nesta aeronave e competência não há lançamentos.
        </Texto>
        <Botao variante="secundario" tamanho="pequeno" aoClicar={aoLimparFiltros}>
          Limpar filtros
        </Botao>
      </div>
    );
  }

  return (
    <table className={estilos.grade}>
      <Cabecalho />
      <tbody className={estilos.corpo}>
        {custos.map((custo) => {
          const id = custo.id ?? 0;
          return (
            <tr className={estilos.linha} key={id}>
              <td className={estilos.celula}>
                <span className={estilos.descricao} title={custo.descricao}>
                  {custo.descricao}
                </span>
                <span className={estilos.categoria}>
                  {custo.categoria ? CATEGORIAS[custo.categoria].rotulo : ''}
                </span>
              </td>
              <td className={estilos.celula}>
                <span className={estilos.dado}>{dataCurta(custo.data)}</span>
              </td>
              <td className={estilos.celula}>
                <span className={estilos.identificador}>{custo.relatorioDeVoo ?? '—'}</span>
              </td>
              <td className={estilos.celula}>
                <span className={estilos.dado}>
                  {custo.tipo ? ROTULO_DO_TIPO[custo.tipo] : '—'}
                </span>
              </td>
              <td className={estilos.celula}>
                <span className={estilos.atribuicao}>
                  {custo.rateado ? (
                    <span className={estilos.rateado}>{ATRIBUICAO_RATEADA}</span>
                  ) : (
                    <>
                      <PontoDeCor
                        cor={(custo.corDeIdentificacao ?? 'CINZA') as CorDeIdentificacao}
                      />
                      <span className={estilos.trunca}>{custo.nomeDoProprietario}</span>
                    </>
                  )}
                </span>
              </td>
              <td className={estilos.celula}>
                <span className={estilos.identificador}>{custo.notaFiscal ?? '—'}</span>
              </td>
              <td className={estilos.celula}>
                <span
                  className={estilos.numero}
                  title={
                    custo.moeda === 'USD'
                      ? `US$ ${custo.valorOriginal} × ${custo.cambio}`
                      : undefined
                  }
                >
                  {moedaEmTexto(custo.valor)}
                </span>
              </td>
              <td className={estilos.celula}>
                {podeGerir ? (
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
                          aoClicar={() => aoCorrigir(custo)}
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
          <td className={estilos.celula}>TOTAL</td>
          <td className={estilos.celula} />
          <td className={estilos.celula} />
          <td className={estilos.celula} />
          <td className={estilos.celula}>
            <span className={estilos.dado}>
              Fixos {moedaEmTexto(lancamentos?.totais?.fixos)} · Variáveis{' '}
              {moedaEmTexto(lancamentos?.totais?.variaveis)}
            </span>
          </td>
          <td className={estilos.celula} />
          <td className={estilos.celula}>
            <span className={estilos.numero}>{moedaEmTexto(lancamentos?.totais?.total)}</span>
          </td>
          <td className={estilos.celula} />
        </tr>
      </tfoot>
    </table>
  );
}

function Cabecalho() {
  return (
    <thead className={estilos.corpo}>
      <tr className={estilos.cabecalho}>
        <th scope="col">Descrição</th>
        <th scope="col">Data</th>
        <th scope="col">Rel-voo</th>
        <th scope="col">Tipo</th>
        <th scope="col">Atribuição</th>
        <th scope="col">NF / Invoice</th>
        <th scope="col" className={estilos.aDireita}>
          Valor · R$
        </th>
        <th scope="col" className={estilos.apenasLeitor}>
          Ações
        </th>
      </tr>
    </thead>
  );
}
