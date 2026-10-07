import { useEffect, useRef, useState } from 'react';

import { useAeronaves } from '@/compartilhado/aeronaves/useAeronaves';
import { hojeLocal } from '@/compartilhado/formatacao/datas';
import { useRecorteDaUrl } from '@/compartilhado/recorte/useRecorteDaUrl';
import { useSessao } from '@/compartilhado/sessao/sessao';
import { juntarClasses } from '@/design-system/classes';
import { Abas } from '@/design-system/primitivos/Abas';
import { Botao } from '@/design-system/primitivos/Botao';
import { Selecao } from '@/design-system/primitivos/Selecao';
import { Texto } from '@/design-system/primitivos/Texto';

import {
  usePainelDeManutencao,
  useReabrirManutencao,
  type ManutencaoResponse,
  type ParametroResponse,
} from '../api/useManutencao';

import { ExclusaoDeManutencao, ExclusaoDeParametro } from './ConfirmacaoDeExclusao';
import estilos from './PaginaDeManutencao.module.css';
import { PainelDeConclusao } from './PainelDeConclusao';
import { PainelDeManutencaoAgendada } from './PainelDeManutencaoAgendada';
import { PainelDeParametro } from './PainelDeParametro';
import { RetornoDaAcao, type Retorno } from './RetornoDaAcao';
import {
  atualEmTexto,
  dataCompleta,
  horaCurta,
  janelaDeAvisoEmTexto,
  limiteEmTexto,
  moedaEmTexto,
  nomeDaManutencao,
  numeroEmTexto,
  restanteEmPalavras,
  ROTULO_DA_SITUACAO,
  ROTULO_DO_TIPO_DE_PARAMETRO,
} from './rotulos';
import type { ContadoresDaAeronave } from './situacaoPrevista';
import tabela from './TabelaDeManutencao.module.css';

type Painel =
  | { tipo: 'novo-parametro' }
  | { tipo: 'editar-parametro'; parametro: ParametroResponse }
  | { tipo: 'excluir-parametro'; parametro: ParametroResponse }
  | { tipo: 'nova-manutencao' }
  | { tipo: 'editar-manutencao'; manutencao: ManutencaoResponse }
  | { tipo: 'concluir-manutencao'; manutencao: ManutencaoResponse }
  | { tipo: 'excluir-manutencao'; manutencao: ManutencaoResponse }
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
  // A aeronave mora na URL: a Central de avisos e os atalhos chegam aqui por ?aeronave=.
  const { aeronaveId: escolhida, setAeronaveId: setEscolhida } = useRecorteDaUrl('');
  const aeronaveId = escolhida || (primeira != null ? String(primeira) : '');
  const consulta = usePainelDeManutencao(aeronaveId);
  const { usuario } = useSessao();
  const [painel, setPainel] = useState<Painel>(null);
  const [secao, setSecao] = useState<Secao>('agenda');
  const [retorno, setRetorno] = useState<Retorno | null>(null);
  const [pedidosDeFoco, setPedidosDeFoco] = useState(0);
  const refDoTitulo = useRef<HTMLHeadingElement>(null);

  const reabrir = useReabrirManutencao();

  const podeGerir = usuario?.papel === 'ADMINISTRADOR' || usuario?.papel === 'GESTOR';
  const painelDaAeronave = consulta.data;
  const aeronave = aeronaves.data?.find((candidata) => String(candidata.id) === aeronaveId);
  const matricula = aeronave?.matricula ?? '';
  // Só se agenda ou monitora numa aeronave que existe e cujo painel carregou: sem isso o painel
  // mandaria aeronaveId 0 (frota vazia) ou nulo (?aeronave=abc).
  const aeronaveDasAcoes = painelDaAeronave && aeronave?.id != null ? aeronave.id : undefined;
  const contadores: ContadoresDaAeronave = {
    horasDeCelula: painelDaAeronave?.horasDeCelula,
    ciclos: painelDaAeronave?.ciclos,
  };
  const parametros = painelDaAeronave?.parametros ?? [];
  const programadas = painelDaAeronave?.programadas ?? [];
  const historico = painelDaAeronave?.historico ?? [];
  const proximos = parametros.filter((parametro) => parametro.situacao === 'ATENCAO').length;
  const estourados = parametros.filter((parametro) => parametro.situacao === 'ESTOURADO').length;

  // A linha da ação muda de aba ou some, levando junto o botão focado: o foco vai ao título da
  // seção, depois que o painel que se fechou devolveu o dele.
  useEffect(() => {
    if (pedidosDeFoco > 0) {
      refDoTitulo.current?.focus();
    }
  }, [pedidosDeFoco]);

  function terminarAcao(mensagem: string) {
    setPainel(null);
    setRetorno({ tom: 'positivo', mensagem });
    setPedidosDeFoco((pedidos) => pedidos + 1);
  }

  function escolherSecao(escolhida: Secao) {
    setSecao(escolhida);
    setRetorno(null);
  }

  function reabrirManutencao(manutencao: ManutencaoResponse) {
    if (manutencao.id == null) {
      return;
    }
    const nome = nomeDaManutencao(manutencao);
    setRetorno(null);
    reabrir.mutate(manutencao.id, {
      onSuccess: () =>
        terminarAcao(`${nome}: reaberta, de volta à agenda; a data de conclusão foi descartada.`),
      onError: (erro) =>
        setRetorno({
          tom: 'critico',
          mensagem: `Não foi possível reabrir ${nome}. ${erro.message}`,
        }),
    });
  }

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
        {podeGerir && aeronaveDasAcoes !== undefined ? (
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

          {/* As regiões vivas do retorno ficam junto das abas, montadas antes de qualquer ação. */}
          <div className={estilos.abas}>
            <Abas<Secao>
              rotulo="Seções da manutenção"
              valor={secao}
              aoEscolher={escolherSecao}
              abas={[
                { valor: 'agenda', rotulo: 'Agenda', contagem: programadas.length },
                { valor: 'historico', rotulo: 'Histórico', contagem: historico.length },
                { valor: 'parametros', rotulo: 'Parâmetros', contagem: parametros.length },
              ]}
            />
            <RetornoDaAcao retorno={retorno} />
          </div>

          {secao === 'agenda' ? (
            <section className={estilos.secao} aria-label="Manutenções programadas">
              <div className={estilos.tituloDaSecao}>
                <h2 className={estilos.titulo} ref={refDoTitulo} tabIndex={-1}>
                  Manutenções programadas · {matricula}
                </h2>
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
                      role="table"
                      className={juntarClasses(
                        tabela.tabela,
                        tabela.agenda,
                        !podeGerir && tabela.semAcoes,
                      )}
                    >
                      <thead role="rowgroup" className={tabela.bloco}>
                        <tr role="row" className={tabela.linhaDeCabecalho}>
                          <th role="columnheader" scope="col">
                            Data
                          </th>
                          <th role="columnheader" scope="col">
                            Descrição
                          </th>
                          <th role="columnheader" scope="col">
                            Responsável
                          </th>
                          <th role="columnheader" scope="col" className={tabela.direita}>
                            Valor
                          </th>
                          <th role="columnheader" scope="col">
                            Situação
                          </th>
                          {podeGerir ? (
                            <th role="columnheader" scope="col" className={estilos.apenasLeitor}>
                              Ações
                            </th>
                          ) : null}
                        </tr>
                      </thead>
                      <tbody role="rowgroup" className={tabela.bloco}>
                        {programadas.map((manutencao) => {
                          const atrasada = estaAtrasada(manutencao.data);
                          const nome = nomeDaManutencao(manutencao);
                          return (
                            <tr role="row" key={manutencao.id} className={tabela.linha}>
                              <td role="cell" className={tabela.celula}>
                                <span className={tabela.forte}>
                                  {dataCompleta(manutencao.data)}
                                </span>
                                {manutencao.hora ? (
                                  <span className={tabela.sublinha}>
                                    {horaCurta(manutencao.hora)}
                                  </span>
                                ) : null}
                              </td>
                              <td role="cell" className={tabela.celula}>
                                <span className={tabela.forte} title={manutencao.descricao}>
                                  {manutencao.descricao}
                                </span>
                              </td>
                              <td role="cell" className={tabela.celula}>
                                <span className={tabela.suave}>
                                  {manutencao.responsavel ?? '—'}
                                </span>
                              </td>
                              <td
                                role="cell"
                                className={juntarClasses(tabela.celula, tabela.direita)}
                              >
                                <span className={tabela.forte}>
                                  {moedaEmTexto(manutencao.valor)}
                                </span>
                              </td>
                              <td role="cell" className={tabela.celula}>
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
                                <td
                                  role="cell"
                                  className={juntarClasses(tabela.celula, tabela.acoes)}
                                >
                                  <Botao
                                    tom="positivo"
                                    tamanho="pequeno"
                                    rotuloAcessivel={`Concluir ${nome}`}
                                    aoClicar={() =>
                                      setPainel({ tipo: 'concluir-manutencao', manutencao })
                                    }
                                  >
                                    ✓ Concluir
                                  </Botao>
                                  <Botao
                                    variante="secundario"
                                    tamanho="pequeno"
                                    rotuloAcessivel={`Editar ${nome}`}
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
                                    rotuloAcessivel={`Excluir ${nome}`}
                                    aoClicar={() =>
                                      setPainel({ tipo: 'excluir-manutencao', manutencao })
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
                <h2 className={estilos.titulo} ref={refDoTitulo} tabIndex={-1}>
                  Histórico de manutenções · {matricula}
                </h2>
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
                      role="table"
                      className={juntarClasses(
                        tabela.tabela,
                        tabela.historico,
                        !podeGerir && tabela.semAcoes,
                      )}
                    >
                      <thead role="rowgroup" className={tabela.bloco}>
                        <tr role="row" className={tabela.linhaDeCabecalho}>
                          <th role="columnheader" scope="col">
                            Conclusão
                          </th>
                          <th role="columnheader" scope="col">
                            Descrição
                          </th>
                          <th role="columnheader" scope="col">
                            Responsável
                          </th>
                          <th role="columnheader" scope="col" className={tabela.direita}>
                            Valor
                          </th>
                          <th role="columnheader" scope="col">
                            Situação
                          </th>
                        </tr>
                      </thead>
                      <tbody role="rowgroup" className={tabela.bloco}>
                        {historico.map((manutencao) => (
                          <tr role="row" key={manutencao.id} className={tabela.linha}>
                            <td role="cell" className={tabela.celula}>
                              <span className={tabela.forte}>
                                {dataCompleta(manutencao.concluidaEm ?? manutencao.data)}
                              </span>
                              {manutencao.concluidaEm &&
                              manutencao.concluidaEm !== manutencao.data ? (
                                <span className={tabela.sublinha}>
                                  programada para {dataCompleta(manutencao.data)}
                                </span>
                              ) : null}
                            </td>
                            <td role="cell" className={tabela.celula}>
                              <span className={tabela.forte} title={manutencao.descricao}>
                                {manutencao.descricao}
                              </span>
                            </td>
                            <td role="cell" className={tabela.celula}>
                              <span className={tabela.suave}>{manutencao.responsavel ?? '—'}</span>
                            </td>
                            <td
                              role="cell"
                              className={juntarClasses(tabela.celula, tabela.direita)}
                            >
                              <span className={tabela.forte}>{moedaEmTexto(manutencao.valor)}</span>
                            </td>
                            <td role="cell" className={juntarClasses(tabela.celula, tabela.acoes)}>
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
                                    rotuloAcessivel={`Reabrir ${nomeDaManutencao(manutencao)}`}
                                    carregando={
                                      reabrir.isPending && reabrir.variables === manutencao.id
                                    }
                                    aoClicar={() => reabrirManutencao(manutencao)}
                                  >
                                    Reabrir
                                  </Botao>
                                  <Botao
                                    variante="secundario"
                                    tamanho="pequeno"
                                    tom="critico"
                                    rotuloAcessivel={`Excluir ${nomeDaManutencao(manutencao)}`}
                                    aoClicar={() =>
                                      setPainel({ tipo: 'excluir-manutencao', manutencao })
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
                <h2 className={tabela.titulo} ref={refDoTitulo} tabIndex={-1}>
                  Parâmetros cadastrados
                </h2>
                {parametros.length === 0 ? (
                  <div className={tabela.vazio}>
                    Nenhum parâmetro cadastrado para esta aeronave — clique em "Novo parâmetro" para
                    começar o monitoramento.
                  </div>
                ) : (
                  <div className={tabela.rolagem}>
                    <table
                      role="table"
                      className={juntarClasses(
                        tabela.tabela,
                        tabela.parametros,
                        !podeGerir && tabela.semAcoes,
                      )}
                    >
                      <thead role="rowgroup" className={tabela.bloco}>
                        <tr role="row" className={tabela.linhaDeCabecalho}>
                          <th role="columnheader" scope="col">
                            Item controlado
                          </th>
                          <th role="columnheader" scope="col">
                            Controle
                          </th>
                          <th role="columnheader" scope="col" className={tabela.direita}>
                            Limite
                          </th>
                          <th role="columnheader" scope="col" className={tabela.direita}>
                            Restante
                          </th>
                          <th role="columnheader" scope="col" className={tabela.direita}>
                            Janela de aviso
                          </th>
                          <th role="columnheader" scope="col">
                            Situação
                          </th>
                          {podeGerir ? (
                            <th role="columnheader" scope="col" className={estilos.apenasLeitor}>
                              Ações
                            </th>
                          ) : null}
                        </tr>
                      </thead>
                      <tbody role="rowgroup" className={tabela.bloco}>
                        {parametros.map((parametro) => {
                          const situacao = parametro.situacao ?? 'REGULAR';
                          const atual = atualEmTexto(parametro);
                          return (
                            <tr role="row" key={parametro.id} className={tabela.linha}>
                              <td role="cell" className={tabela.celula}>
                                <span className={tabela.forte} title={parametro.nome}>
                                  {parametro.nome}
                                </span>
                              </td>
                              <td role="cell" className={tabela.celula}>
                                <span className={tabela.suave}>
                                  {parametro.tipo
                                    ? ROTULO_DO_TIPO_DE_PARAMETRO[parametro.tipo]
                                    : '—'}
                                </span>
                              </td>
                              <td
                                role="cell"
                                className={juntarClasses(tabela.celula, tabela.direita)}
                              >
                                <span className={tabela.forte}>{limiteEmTexto(parametro)}</span>
                                {atual ? <span className={tabela.sublinha}>{atual}</span> : null}
                              </td>
                              <td
                                role="cell"
                                className={juntarClasses(tabela.celula, tabela.direita)}
                              >
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
                              <td
                                role="cell"
                                className={juntarClasses(tabela.celula, tabela.direita)}
                              >
                                <span className={tabela.suave}>
                                  {janelaDeAvisoEmTexto(parametro)}
                                </span>
                              </td>
                              <td role="cell" className={tabela.celula}>
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
                                <td
                                  role="cell"
                                  className={juntarClasses(tabela.celula, tabela.acoes)}
                                >
                                  <Botao
                                    variante="secundario"
                                    tamanho="pequeno"
                                    rotuloAcessivel={`Editar parâmetro ${parametro.nome ?? ''}`}
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
                                    rotuloAcessivel={`Excluir parâmetro ${parametro.nome ?? ''}`}
                                    aoClicar={() =>
                                      setPainel({ tipo: 'excluir-parametro', parametro })
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

      {painel && aeronaveDasAcoes !== undefined ? (
        <PainelDaVez
          painel={painel}
          aeronaveId={aeronaveDasAcoes}
          contadores={contadores}
          aoFechar={() => setPainel(null)}
          aoTerminar={terminarAcao}
        />
      ) : null}
    </div>
  );
}

/** O painel aberto sobre a página: formulário, conclusão ou confirmação de exclusão. */
function PainelDaVez({
  painel,
  aeronaveId,
  contadores,
  aoFechar,
  aoTerminar,
}: {
  painel: NonNullable<Painel>;
  aeronaveId: number;
  contadores: ContadoresDaAeronave;
  aoFechar: () => void;
  /** Depois de uma ação que tira a linha do lugar: anuncia o resultado e cuida do foco. */
  aoTerminar: (mensagem: string) => void;
}) {
  switch (painel.tipo) {
    case 'novo-parametro':
    case 'editar-parametro':
      return (
        <PainelDeParametro
          aeronaveId={aeronaveId}
          contadores={contadores}
          parametro={painel.tipo === 'editar-parametro' ? painel.parametro : undefined}
          aoFechar={aoFechar}
        />
      );
    case 'excluir-parametro':
      return (
        <ExclusaoDeParametro
          parametro={painel.parametro}
          aoFechar={aoFechar}
          aoExcluir={() => aoTerminar(`Parâmetro ${painel.parametro.nome ?? ''} excluído.`)}
        />
      );
    case 'nova-manutencao':
    case 'editar-manutencao':
      return (
        <PainelDeManutencaoAgendada
          aeronaveId={aeronaveId}
          manutencao={painel.tipo === 'editar-manutencao' ? painel.manutencao : undefined}
          aoFechar={aoFechar}
        />
      );
    case 'concluir-manutencao':
      return (
        <PainelDeConclusao
          manutencao={painel.manutencao}
          aoFechar={aoFechar}
          aoConcluir={(concluidaEm) =>
            aoTerminar(
              `${nomeDaManutencao(painel.manutencao)}: concluída em ${dataCompleta(concluidaEm)}, agora no histórico.`,
            )
          }
        />
      );
    case 'excluir-manutencao':
      return (
        <ExclusaoDeManutencao
          manutencao={painel.manutencao}
          aoFechar={aoFechar}
          aoExcluir={() => aoTerminar(`${nomeDaManutencao(painel.manutencao)}: excluída.`)}
        />
      );
  }
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
  return iso !== undefined && iso < hojeLocal();
}
