import { useState } from 'react';

import { useAeronaves } from '@/compartilhado/aeronaves/useAeronaves';
import { useSessao } from '@/compartilhado/sessao/sessao';
import { juntarClasses } from '@/design-system/classes';
import { Abas } from '@/design-system/primitivos/Abas';
import { Botao } from '@/design-system/primitivos/Botao';
import { Selecao } from '@/design-system/primitivos/Selecao';
import { Texto } from '@/design-system/primitivos/Texto';

import {
  useConcluirManutencao,
  useExcluirManutencao,
  useExcluirParametro,
  usePainelDeManutencao,
  useReabrirManutencao,
  type ManutencaoResponse,
  type ParametroResponse,
} from '../api/useManutencao';

import estilos from './PaginaDeManutencao.module.css';
import { PainelDeManutencaoAgendada } from './PainelDeManutencaoAgendada';
import { PainelDeParametro } from './PainelDeParametro';
import {
  atualEmTexto,
  dataCurta,
  horaCurta,
  janelaDeAvisoEmTexto,
  limiteEmTexto,
  moedaEmTexto,
  numeroEmTexto,
  restanteEmPalavras,
  ROTULO_DA_SITUACAO,
  ROTULO_DO_TIPO_DE_PARAMETRO,
} from './rotulos';
import tabela from './TabelaDeManutencao.module.css';

type Painel =
  | { tipo: 'novo-parametro' }
  | { tipo: 'editar-parametro'; parametro: ParametroResponse }
  | { tipo: 'nova-manutencao' }
  | { tipo: 'editar-manutencao'; manutencao: ManutencaoResponse }
  | null;

type Secao = 'agenda' | 'historico' | 'parametros';

const ETIQUETA_DA_SITUACAO = {
  REGULAR: 'etiquetaRegular',
  ATENCAO: 'etiquetaAtencao',
  ESTOURADO: 'etiquetaCritica',
} as const;

const HOJE = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' });

/**
 * A manutenção de uma aeronave, nas três seções do protótipo: a agenda (programadas), o histórico
 * (concluídas) e os parâmetros de controle. Os contadores de referência ficam no topo, como chips,
 * porque são a régua contra a qual todo parâmetro é julgado.
 *
 * <p>O formulário de agendamento embutido do protótipo e a coluna de documentos por manutenção não
 * estão aqui: o painel modal existente cobre o agendamento, e documentos é feature por vir.
 */
export function PaginaDeManutencao() {
  const aeronaves = useAeronaves();
  const primeira = aeronaves.data?.[0]?.id;
  const [escolhida, setEscolhida] = useState('');
  const aeronaveId = escolhida || (primeira != null ? String(primeira) : '');
  const consulta = usePainelDeManutencao(aeronaveId);
  const { usuario } = useSessao();
  const [painel, setPainel] = useState<Painel>(null);
  const [secao, setSecao] = useState<Secao>('agenda');

  const concluir = useConcluirManutencao();
  const reabrir = useReabrirManutencao();
  const excluirManutencao = useExcluirManutencao();
  const excluirParametro = useExcluirParametro();

  const podeGerir = usuario?.papel === 'ADMINISTRADOR' || usuario?.papel === 'GESTOR';
  const painelDaAeronave = consulta.data;
  const matricula =
    aeronaves.data?.find((aeronave) => String(aeronave.id) === aeronaveId)?.matricula ?? '';
  const parametros = painelDaAeronave?.parametros ?? [];
  const programadas = painelDaAeronave?.programadas ?? [];
  const historico = painelDaAeronave?.historico ?? [];
  const proximos = parametros.filter((parametro) => parametro.situacao === 'ATENCAO').length;
  const estourados = parametros.filter((parametro) => parametro.situacao === 'ESTOURADO').length;

  return (
    <div className={estilos.tela}>
      <div className={estilos.cabecalho}>
        <Selecao
          rotulo="Aeronave"
          rotuloOculto
          valor={aeronaveId}
          opcoes={(aeronaves.data ?? []).map((aeronave) => ({
            valor: String(aeronave.id),
            rotulo: `${aeronave.matricula} — ${aeronave.modelo}`,
          }))}
          aoMudar={setEscolhida}
        />
        {painelDaAeronave ? (
          <>
            {/* Os contadores são a régua dos parâmetros: ficam à mão, como chips do protótipo. */}
            <span className={estilos.chip}>
              Célula: {numeroEmTexto(painelDaAeronave.horasDeCelula)} h
            </span>
            <span className={estilos.chip}>Ciclos: {numeroEmTexto(painelDaAeronave.ciclos)}</span>
            <Texto variante="apoio" tom="suave" como="span">
              Referência: {HOJE.format(new Date())}
            </Texto>
          </>
        ) : null}
        <span className={estilos.espaco} />
        {podeGerir ? (
          <div className={estilos.acoesDoTopo}>
            <Botao
              variante="secundario"
              tamanho="grande"
              aoClicar={() => setPainel({ tipo: 'nova-manutencao' })}
            >
              Nova manutenção
            </Botao>
            <Botao tamanho="grande" aoClicar={() => setPainel({ tipo: 'novo-parametro' })}>
              + Novo parâmetro
            </Botao>
          </div>
        ) : null}
      </div>

      {consulta.isError ? (
        <div className={estilos.recado} role="alert">
          <Texto variante="corpo" como="p">
            Não foi possível carregar a manutenção.
          </Texto>
          <Botao variante="secundario" tamanho="pequeno" aoClicar={() => void consulta.refetch()}>
            Tentar de novo
          </Botao>
        </div>
      ) : null}

      {painelDaAeronave ? (
        <>
          <ul className={estilos.indicadores}>
            <Indicador rotulo="Parâmetros monitorados" valor={parametros.length} />
            <Indicador
              rotulo="Próximos do limite"
              valor={proximos}
              tom={proximos > 0 ? 'atencao' : undefined}
              apoio="dentro da janela de aviso"
            />
            <Indicador
              rotulo="Limite estourado"
              valor={estourados}
              tom={estourados > 0 ? 'critico' : undefined}
              apoio="exigem intervenção"
            />
            <Indicador rotulo="Programadas" valor={programadas.length} apoio="na agenda" />
          </ul>

          <Abas<Secao>
            rotulo="Seções da manutenção"
            valor={secao}
            aoEscolher={setSecao}
            abas={[
              { valor: 'agenda', rotulo: 'Agenda', contagem: programadas.length },
              { valor: 'historico', rotulo: 'Histórico', contagem: historico.length },
              { valor: 'parametros', rotulo: 'Parâmetros', contagem: parametros.length },
            ]}
          />

          {secao === 'agenda' ? (
            <section className={estilos.secao} aria-label="Manutenções programadas">
              <div className={estilos.tituloDaSecao}>
                <h2 className={estilos.titulo}>Manutenções programadas · {matricula}</h2>
                <Texto variante="apoio" tom="suave" como="p">
                  Ordenadas pela proximidade da data. Aparecem no calendário de voos.
                </Texto>
              </div>
              <div className={tabela.cartao}>
                {programadas.length === 0 ? (
                  <div className={tabela.vazio}>
                    Nenhuma manutenção programada para esta aeronave — as concluídas ficam no
                    Histórico.
                  </div>
                ) : (
                  <div className={tabela.rolagem}>
                    <table
                      className={juntarClasses(
                        tabela.tabela,
                        tabela.agenda,
                        !podeGerir && tabela.semAcoes,
                      )}
                    >
                      <thead className={tabela.bloco}>
                        <tr className={tabela.linhaDeCabecalho}>
                          <th scope="col">Data</th>
                          <th scope="col">Descrição</th>
                          <th scope="col">Responsável</th>
                          <th scope="col" className={tabela.direita}>
                            Valor
                          </th>
                          <th scope="col">Situação</th>
                          {podeGerir ? (
                            <th scope="col" className={estilos.apenasLeitor}>
                              Ações
                            </th>
                          ) : null}
                        </tr>
                      </thead>
                      <tbody className={tabela.bloco}>
                        {programadas.map((manutencao) => {
                          const atrasada = estaAtrasada(manutencao.data);
                          return (
                            <tr key={manutencao.id} className={tabela.linha}>
                              <td className={tabela.celula}>
                                <span className={tabela.forte}>{dataCurta(manutencao.data)}</span>
                                {manutencao.hora ? (
                                  <span className={tabela.sublinha}>
                                    {horaCurta(manutencao.hora)}
                                  </span>
                                ) : null}
                              </td>
                              <td className={tabela.celula}>
                                <span className={tabela.forte} title={manutencao.descricao}>
                                  {manutencao.descricao}
                                </span>
                              </td>
                              <td className={tabela.celula}>
                                <span className={tabela.suave}>
                                  {manutencao.responsavel ?? '—'}
                                </span>
                              </td>
                              <td className={juntarClasses(tabela.celula, tabela.direita)}>
                                <span className={tabela.forte}>
                                  {moedaEmTexto(manutencao.valor)}
                                </span>
                              </td>
                              <td className={tabela.celula}>
                                <span
                                  className={juntarClasses(
                                    tabela.etiqueta,
                                    atrasada ? tabela.etiquetaCritica : tabela.etiquetaNeutra,
                                  )}
                                >
                                  {atrasada ? 'Atrasada' : 'Programada'}
                                </span>
                              </td>
                              {podeGerir ? (
                                <td className={juntarClasses(tabela.celula, tabela.acoes)}>
                                  <Botao
                                    variante="secundario"
                                    tamanho="pequeno"
                                    carregando={concluir.isPending}
                                    aoClicar={() =>
                                      manutencao.id != null && concluir.mutate(manutencao.id)
                                    }
                                  >
                                    Concluir
                                  </Botao>
                                  <Botao
                                    variante="secundario"
                                    tamanho="pequeno"
                                    aoClicar={() =>
                                      setPainel({ tipo: 'editar-manutencao', manutencao })
                                    }
                                  >
                                    Editar
                                  </Botao>
                                  <Botao
                                    variante="secundario"
                                    tamanho="pequeno"
                                    tom="critico"
                                    aoClicar={() =>
                                      manutencao.id != null &&
                                      excluirManutencao.mutate(manutencao.id)
                                    }
                                  >
                                    Excluir
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
              </div>
            </section>
          ) : null}

          {secao === 'historico' ? (
            <section className={estilos.secao} aria-label="Histórico de manutenções">
              <div className={estilos.tituloDaSecao}>
                <h2 className={estilos.titulo}>Histórico de manutenções · {matricula}</h2>
                <Texto variante="apoio" tom="suave" como="p">
                  {contagemDeConcluidas(historico.length)} — registro permanente das intervenções
                  executadas nesta aeronave.
                </Texto>
              </div>
              <div className={tabela.cartao}>
                {historico.length === 0 ? (
                  <div className={tabela.vazio}>
                    Nenhuma manutenção concluída para esta aeronave.
                  </div>
                ) : (
                  <div className={tabela.rolagem}>
                    <table
                      className={juntarClasses(
                        tabela.tabela,
                        tabela.historico,
                        !podeGerir && tabela.semAcoes,
                      )}
                    >
                      <thead className={tabela.bloco}>
                        <tr className={tabela.linhaDeCabecalho}>
                          <th scope="col">Conclusão</th>
                          <th scope="col">Descrição</th>
                          <th scope="col">Responsável</th>
                          <th scope="col" className={tabela.direita}>
                            Valor
                          </th>
                          <th scope="col">Situação</th>
                        </tr>
                      </thead>
                      <tbody className={tabela.bloco}>
                        {historico.map((manutencao) => (
                          <tr key={manutencao.id} className={tabela.linha}>
                            <td className={tabela.celula}>
                              <span className={tabela.forte}>{dataCurta(manutencao.data)}</span>
                            </td>
                            <td className={tabela.celula}>
                              <span className={tabela.forte} title={manutencao.descricao}>
                                {manutencao.descricao}
                              </span>
                            </td>
                            <td className={tabela.celula}>
                              <span className={tabela.suave}>{manutencao.responsavel ?? '—'}</span>
                            </td>
                            <td className={juntarClasses(tabela.celula, tabela.direita)}>
                              <span className={tabela.forte}>{moedaEmTexto(manutencao.valor)}</span>
                            </td>
                            <td className={juntarClasses(tabela.celula, tabela.acoes)}>
                              <span
                                className={juntarClasses(tabela.etiqueta, tabela.etiquetaRegular)}
                              >
                                Concluída
                              </span>
                              {podeGerir ? (
                                <>
                                  <Botao
                                    variante="secundario"
                                    tamanho="pequeno"
                                    carregando={reabrir.isPending}
                                    aoClicar={() =>
                                      manutencao.id != null && reabrir.mutate(manutencao.id)
                                    }
                                  >
                                    Reabrir
                                  </Botao>
                                  <Botao
                                    variante="secundario"
                                    tamanho="pequeno"
                                    tom="critico"
                                    aoClicar={() =>
                                      manutencao.id != null &&
                                      excluirManutencao.mutate(manutencao.id)
                                    }
                                  >
                                    Excluir
                                  </Botao>
                                </>
                              ) : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          ) : null}

          {secao === 'parametros' ? (
            <section className={estilos.secao} aria-label="Parâmetros de controle">
              <div className={tabela.cartao}>
                <h2 className={tabela.titulo}>Parâmetros cadastrados</h2>
                {parametros.length === 0 ? (
                  <div className={tabela.vazio}>
                    Nenhum parâmetro cadastrado para esta aeronave — clique em "Novo parâmetro" para
                    começar o monitoramento.
                  </div>
                ) : (
                  <div className={tabela.rolagem}>
                    <table
                      className={juntarClasses(
                        tabela.tabela,
                        tabela.parametros,
                        !podeGerir && tabela.semAcoes,
                      )}
                    >
                      <thead className={tabela.bloco}>
                        <tr className={tabela.linhaDeCabecalho}>
                          <th scope="col">Item controlado</th>
                          <th scope="col">Controle</th>
                          <th scope="col" className={tabela.direita}>
                            Limite
                          </th>
                          <th scope="col" className={tabela.direita}>
                            Restante
                          </th>
                          <th scope="col" className={tabela.direita}>
                            Janela de aviso
                          </th>
                          <th scope="col">Situação</th>
                          {podeGerir ? (
                            <th scope="col" className={estilos.apenasLeitor}>
                              Ações
                            </th>
                          ) : null}
                        </tr>
                      </thead>
                      <tbody className={tabela.bloco}>
                        {parametros.map((parametro) => {
                          const situacao = parametro.situacao ?? 'REGULAR';
                          const atual = atualEmTexto(parametro);
                          return (
                            <tr key={parametro.id} className={tabela.linha}>
                              <td className={tabela.celula}>
                                <span className={tabela.forte} title={parametro.nome}>
                                  {parametro.nome}
                                </span>
                              </td>
                              <td className={tabela.celula}>
                                <span className={tabela.suave}>
                                  {parametro.tipo
                                    ? ROTULO_DO_TIPO_DE_PARAMETRO[parametro.tipo]
                                    : '—'}
                                </span>
                              </td>
                              <td className={juntarClasses(tabela.celula, tabela.direita)}>
                                <span className={tabela.forte}>{limiteEmTexto(parametro)}</span>
                                {atual ? <span className={tabela.sublinha}>{atual}</span> : null}
                              </td>
                              <td className={juntarClasses(tabela.celula, tabela.direita)}>
                                <span
                                  className={juntarClasses(
                                    tabela.forte,
                                    situacao === 'ATENCAO' && tabela.atencao,
                                    situacao === 'ESTOURADO' && tabela.critico,
                                  )}
                                >
                                  {restanteEmPalavras(parametro.restante, parametro.tipo)}
                                </span>
                              </td>
                              <td className={juntarClasses(tabela.celula, tabela.direita)}>
                                <span className={tabela.suave}>
                                  {janelaDeAvisoEmTexto(parametro)}
                                </span>
                              </td>
                              <td className={tabela.celula}>
                                <span
                                  className={juntarClasses(
                                    tabela.etiqueta,
                                    tabela[ETIQUETA_DA_SITUACAO[situacao]],
                                  )}
                                >
                                  {ROTULO_DA_SITUACAO[situacao]}
                                </span>
                              </td>
                              {podeGerir ? (
                                <td className={juntarClasses(tabela.celula, tabela.acoes)}>
                                  <Botao
                                    variante="secundario"
                                    tamanho="pequeno"
                                    aoClicar={() =>
                                      setPainel({ tipo: 'editar-parametro', parametro })
                                    }
                                  >
                                    Editar
                                  </Botao>
                                  <Botao
                                    variante="secundario"
                                    tamanho="pequeno"
                                    tom="critico"
                                    aoClicar={() =>
                                      parametro.id != null && excluirParametro.mutate(parametro.id)
                                    }
                                  >
                                    Excluir
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
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      {painel?.tipo === 'novo-parametro' || painel?.tipo === 'editar-parametro' ? (
        <PainelDeParametro
          key={painel.tipo === 'editar-parametro' ? painel.parametro.id : 'novo'}
          aeronaveId={Number(aeronaveId)}
          parametro={painel.tipo === 'editar-parametro' ? painel.parametro : undefined}
          aoFechar={() => setPainel(null)}
        />
      ) : null}
      {painel?.tipo === 'nova-manutencao' || painel?.tipo === 'editar-manutencao' ? (
        <PainelDeManutencaoAgendada
          key={painel.tipo === 'editar-manutencao' ? painel.manutencao.id : 'novo'}
          aeronaveId={Number(aeronaveId)}
          manutencao={painel.tipo === 'editar-manutencao' ? painel.manutencao : undefined}
          aoFechar={() => setPainel(null)}
        />
      ) : null}
    </div>
  );
}

/** Um indicador do topo: rótulo, número e, se houver, o que o número significa. */
function Indicador({
  rotulo,
  valor,
  tom,
  apoio,
}: {
  rotulo: string;
  valor: number;
  tom?: 'atencao' | 'critico';
  apoio?: string;
}) {
  return (
    <li className={estilos.indicador}>
      <span className={estilos.indicadorRotulo}>{rotulo}</span>
      <span className={juntarClasses(estilos.indicadorValor, tom && estilos[tom])}>{valor}</span>
      {apoio ? <span className={estilos.indicadorApoio}>{apoio}</span> : null}
    </li>
  );
}

function contagemDeConcluidas(total: number): string {
  if (total === 0) {
    return 'Nenhuma concluída';
  }
  return total === 1 ? '1 concluída' : `${total} concluídas`;
}

/** Programada com data anterior a hoje: a etiqueta muda para "Atrasada". */
function estaAtrasada(iso: string | undefined): boolean {
  if (!iso) {
    return false;
  }
  const hoje = new Date();
  const hojeIso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
  return iso < hojeIso;
}
