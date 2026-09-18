import { useState } from 'react';

import { juntarClasses } from '@/design-system/classes';
import { Botao } from '@/design-system/primitivos/Botao';
import { Esqueleto } from '@/design-system/primitivos/Esqueleto';
import { PontoDeCor, type CorDeIdentificacao } from '@/design-system/primitivos/SeletorDeCor';
import { Texto } from '@/design-system/primitivos/Texto';

import { useExcluirCusto, type CustoResponse, type TotaisDosLancamentos } from '../api/useCustos';

import { ATRIBUICAO_RATEADA, CATEGORIAS, dataCurta, moedaEmTexto, ROTULO_DO_TIPO } from './rotulos';
import estilos from './TabelaDeCustos.module.css';

interface TabelaDeCustosProps {
  custos: CustoResponse[];
  /** Os totais do recorte do servidor (aeronave e competência), não do filtro local. */
  totais: TotaisDosLancamentos | undefined;
  carregando: boolean;
  erro: boolean;
  podeGerir: boolean;
  aoCorrigir: (custo: CustoResponse) => void;
  aoTentarDeNovo: () => void;
  aoLimparFiltros: () => void;
}

const LINHAS_DO_ESQUELETO = 4;

/**
 * A grade dos lançamentos na régua do protótipo — rel-voo, tipo, descrição, atribuição, valor,
 * nota — e, embaixo, a faixa de totais separada em fixos e variáveis, somada no servidor.
 */
export function TabelaDeCustos({
  custos,
  totais,
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
        <div className={estilos.rolagem}>
          <table className={juntarClasses(estilos.grade, !podeGerir && estilos.semAcoes)}>
            <Cabecalho podeGerir={podeGerir} />
            <tbody className={estilos.corpo}>
              {Array.from({ length: LINHAS_DO_ESQUELETO }, (_, indice) => (
                <tr className={estilos.linha} key={indice} aria-hidden="true">
                  {Array.from({ length: podeGerir ? 7 : 6 }, (_, celula) => (
                    <td className={estilos.celula} key={celula}>
                      <Esqueleto />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  if (custos.length === 0) {
    return (
      <div className={estilos.recado}>
        <Texto variante="corpo" como="p">
          Nenhum lançamento encontrado
        </Texto>
        <Texto variante="apoio" tom="suave" como="p">
          Ajuste os filtros ou a categoria, ou lance o primeiro custo em "Registrar custo".
        </Texto>
        <Botao variante="secundario" tamanho="pequeno" aoClicar={aoLimparFiltros}>
          Limpar filtros
        </Botao>
      </div>
    );
  }

  return (
    <>
      <div className={estilos.rolagem}>
        <table className={juntarClasses(estilos.grade, !podeGerir && estilos.semAcoes)}>
          <Cabecalho podeGerir={podeGerir} />
          <tbody className={estilos.corpo}>
            {custos.map((custo) => {
              const id = custo.id ?? 0;
              return (
                <tr className={estilos.linha} key={id}>
                  <td className={estilos.celula}>
                    <span className={estilos.identificador}>{custo.relatorioDeVoo ?? '—'}</span>
                    <span className={estilos.sublinha}>{dataCurta(custo.data)}</span>
                  </td>
                  <td className={estilos.celula}>
                    {custo.tipo ? (
                      <span
                        className={juntarClasses(
                          estilos.etiqueta,
                          custo.tipo === 'FIXO' ? estilos.fixo : estilos.variavel,
                        )}
                      >
                        {ROTULO_DO_TIPO[custo.tipo]}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className={estilos.celula}>
                    <span className={estilos.descricao} title={custo.descricao}>
                      {custo.descricao}
                    </span>
                    <span className={estilos.sublinha}>
                      {custo.categoria ? CATEGORIAS[custo.categoria].rotulo : ''}
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
                  <td className={juntarClasses(estilos.celula, estilos.direita)}>
                    <span className={estilos.numero}>{moedaEmTexto(custo.valor)}</span>
                    {custo.moeda === 'USD' ? (
                      <span className={estilos.sublinha}>
                        US$ {custo.valorOriginal} × {custo.cambio}
                      </span>
                    ) : null}
                  </td>
                  <td className={estilos.celula}>
                    <span className={estilos.identificador}>{custo.notaFiscal ?? '—'}</span>
                  </td>
                  {podeGerir ? (
                    <td className={juntarClasses(estilos.celula, estilos.acoes)}>
                      {confirmando === id ? (
                        <>
                          <Botao
                            variante="secundario"
                            tamanho="pequeno"
                            tom="critico"
                            carregando={excluir.isPending}
                            aoClicar={() =>
                              excluir.mutate(id, { onSettled: () => setConfirmando(null) })
                            }
                          >
                            Excluir?
                          </Botao>
                          <Botao
                            variante="secundario"
                            tamanho="pequeno"
                            aoClicar={() => setConfirmando(null)}
                          >
                            Cancelar
                          </Botao>
                        </>
                      ) : (
                        <>
                          <Botao
                            variante="secundario"
                            tamanho="pequeno"
                            aoClicar={() => aoCorrigir(custo)}
                          >
                            Editar
                          </Botao>
                          <Botao
                            variante="secundario"
                            tamanho="pequeno"
                            tom="critico"
                            aoClicar={() => setConfirmando(id)}
                          >
                            Excluir
                          </Botao>
                        </>
                      )}
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* Os totais são do recorte do servidor, não da categoria filtrada aqui: a faixa diz isso. */}
      <dl className={estilos.totais} role="group" aria-label="Totais do recorte">
        <div className={estilos.total}>
          <dt>Fixos</dt>
          <dd>{moedaEmTexto(totais?.fixos)}</dd>
        </div>
        <div className={estilos.total}>
          <dt>Variáveis</dt>
          <dd>{moedaEmTexto(totais?.variaveis)}</dd>
        </div>
        <div className={estilos.total}>
          <dt>Total</dt>
          <dd>{moedaEmTexto(totais?.total)}</dd>
        </div>
      </dl>
    </>
  );
}

function Cabecalho({ podeGerir }: { podeGerir: boolean }) {
  return (
    <thead className={estilos.corpo}>
      <tr className={estilos.cabecalho}>
        <th scope="col">Rel-voo</th>
        <th scope="col">Tipo</th>
        <th scope="col">Descrição</th>
        <th scope="col">Atribuição</th>
        <th scope="col" className={estilos.direita}>
          Valor · R$
        </th>
        <th scope="col">NF / Invoice</th>
        {podeGerir ? (
          <th scope="col" className={estilos.apenasLeitor}>
            Ações
          </th>
        ) : null}
      </tr>
    </thead>
  );
}
