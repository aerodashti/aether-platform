import { useState } from 'react';

import { useAeronaves } from '@/compartilhado/aeronaves/useAeronaves';
import { useSessao } from '@/compartilhado/sessao/sessao';
import { juntarClasses } from '@/design-system/classes';
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
  dataCurta,
  moedaEmTexto,
  numeroEmTexto,
  restanteEmPalavras,
  ROTULO_DA_SITUACAO,
} from './rotulos';

type Painel =
  | { tipo: 'novo-parametro' }
  | { tipo: 'editar-parametro'; parametro: ParametroResponse }
  | { tipo: 'nova-manutencao' }
  | { tipo: 'editar-manutencao'; manutencao: ManutencaoResponse }
  | null;

const CLASSE_DA_SITUACAO = {
  REGULAR: 'regular',
  ATENCAO: 'atencao',
  ESTOURADO: 'estourado',
} as const;

export function PaginaDeManutencao() {
  const aeronaves = useAeronaves();
  const primeira = aeronaves.data?.[0]?.id;
  const [escolhida, setEscolhida] = useState('');
  const aeronaveId = escolhida || (primeira != null ? String(primeira) : '');
  const consulta = usePainelDeManutencao(aeronaveId);
  const { usuario } = useSessao();
  const [painel, setPainel] = useState<Painel>(null);

  const concluir = useConcluirManutencao();
  const reabrir = useReabrirManutencao();
  const excluirManutencao = useExcluirManutencao();
  const excluirParametro = useExcluirParametro();

  const podeGerir = usuario?.papel === 'ADMINISTRADOR' || usuario?.papel === 'GESTOR';
  const painelDaAeronave = consulta.data;
  const proximos =
    painelDaAeronave?.parametros?.filter((parametro) => parametro.situacao !== 'REGULAR').length ??
    0;

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
        {podeGerir ? (
          <div className={estilos.acoesDoTopo}>
            <Botao
              variante="secundario"
              tamanho="pequeno"
              aoClicar={() => setPainel({ tipo: 'novo-parametro' })}
            >
              Novo parâmetro
            </Botao>
            <Botao tamanho="pequeno" aoClicar={() => setPainel({ tipo: 'nova-manutencao' })}>
              Nova manutenção
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
          <dl className={estilos.referencias}>
            <div className={estilos.referencia}>
              <dt className={estilos.referenciaRotulo}>Horas de célula</dt>
              <dd className={estilos.referenciaValor}>
                {numeroEmTexto(painelDaAeronave.horasDeCelula)} h
              </dd>
            </div>
            <div className={estilos.referencia}>
              <dt className={estilos.referenciaRotulo}>Ciclos</dt>
              <dd className={estilos.referenciaValor}>{numeroEmTexto(painelDaAeronave.ciclos)}</dd>
            </div>
            <div className={estilos.referencia}>
              <dt className={estilos.referenciaRotulo}>Parâmetros monitorados</dt>
              <dd className={estilos.referenciaValor}>
                {painelDaAeronave.parametros?.length ?? 0}
              </dd>
            </div>
            <div className={estilos.referencia}>
              <dt className={estilos.referenciaRotulo}>Próximos do limite</dt>
              <dd
                className={juntarClasses(
                  estilos.referenciaValor,
                  proximos > 0 && estilos.referenciaAtencao,
                )}
              >
                {proximos}
              </dd>
            </div>
          </dl>

          <section className={estilos.secao} aria-label="Parâmetros de controle">
            <Texto variante="legenda" tom="suave" como="h2">
              Parâmetros de controle
            </Texto>
            {(painelDaAeronave.parametros ?? []).length === 0 ? (
              <Texto variante="apoio" tom="suave" como="p">
                Nenhum parâmetro monitorado nesta aeronave — crie o primeiro em "Novo parâmetro".
              </Texto>
            ) : (
              <ul className={estilos.parametros}>
                {(painelDaAeronave.parametros ?? []).map((parametro) => {
                  const situacao = parametro.situacao ?? 'REGULAR';
                  return (
                    <li key={parametro.id} className={estilos.parametro}>
                      <span
                        className={juntarClasses(
                          estilos.situacao,
                          estilos[CLASSE_DA_SITUACAO[situacao]],
                        )}
                      >
                        <span className={estilos.ponto} aria-hidden="true" />
                        {ROTULO_DA_SITUACAO[situacao]}
                      </span>
                      <span className={estilos.parametroNome}>{parametro.nome}</span>
                      <span className={estilos.parametroRestante}>
                        {restanteEmPalavras(parametro.restante, parametro.tipo)}
                      </span>
                      {podeGerir ? (
                        <span className={estilos.acoes}>
                          <Botao
                            variante="fantasma"
                            tamanho="pequeno"
                            aoClicar={() => setPainel({ tipo: 'editar-parametro', parametro })}
                          >
                            Editar
                          </Botao>
                          <Botao
                            variante="fantasma"
                            tamanho="pequeno"
                            tom="critico"
                            aoClicar={() =>
                              parametro.id != null && excluirParametro.mutate(parametro.id)
                            }
                          >
                            Excluir
                          </Botao>
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <SecaoDeEventos
            titulo="Manutenções programadas"
            descricao="Ordenadas pela proximidade da data. Aparecem no calendário de voos."
            eventos={painelDaAeronave.programadas ?? []}
            vazio='Nenhuma manutenção programada — agende a primeira em "Nova manutenção".'
            podeGerir={podeGerir}
            acoes={(manutencao) => (
              <>
                <Botao
                  variante="fantasma"
                  tamanho="pequeno"
                  carregando={concluir.isPending}
                  aoClicar={() => manutencao.id != null && concluir.mutate(manutencao.id)}
                >
                  Concluir
                </Botao>
                <Botao
                  variante="fantasma"
                  tamanho="pequeno"
                  aoClicar={() => setPainel({ tipo: 'editar-manutencao', manutencao })}
                >
                  Editar
                </Botao>
                <Botao
                  variante="fantasma"
                  tamanho="pequeno"
                  tom="critico"
                  aoClicar={() => manutencao.id != null && excluirManutencao.mutate(manutencao.id)}
                >
                  Excluir
                </Botao>
              </>
            )}
          />

          <SecaoDeEventos
            titulo="Histórico de manutenções"
            descricao="Registro permanente das intervenções executadas nesta aeronave."
            eventos={painelDaAeronave.historico ?? []}
            vazio="Nenhuma manutenção concluída ainda — as concluídas ficam aqui para sempre."
            podeGerir={podeGerir}
            acoes={(manutencao) => (
              <Botao
                variante="fantasma"
                tamanho="pequeno"
                carregando={reabrir.isPending}
                aoClicar={() => manutencao.id != null && reabrir.mutate(manutencao.id)}
              >
                Reabrir
              </Botao>
            )}
          />
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

function SecaoDeEventos({
  titulo,
  descricao,
  eventos,
  vazio,
  podeGerir,
  acoes,
}: {
  titulo: string;
  descricao: string;
  eventos: ManutencaoResponse[];
  vazio: string;
  podeGerir: boolean;
  acoes: (manutencao: ManutencaoResponse) => React.ReactNode;
}) {
  return (
    <section className={estilos.secao} aria-label={titulo}>
      <Texto variante="legenda" tom="suave" como="h2">
        {titulo}
      </Texto>
      <Texto variante="apoio" tom="suave" como="p">
        {descricao}
      </Texto>
      {eventos.length === 0 ? (
        <Texto variante="apoio" tom="suave" como="p">
          {vazio}
        </Texto>
      ) : (
        <ul className={estilos.eventos}>
          {eventos.map((manutencao) => (
            <li key={manutencao.id} className={estilos.evento}>
              <span className={estilos.eventoData}>
                {dataCurta(manutencao.data)}
                {manutencao.hora ? ` · ${manutencao.hora.slice(0, 5)}` : ''}
              </span>
              <span className={estilos.eventoDescricao}>
                <span className={estilos.trunca}>{manutencao.descricao}</span>
                <span className={estilos.eventoResponsavel}>{manutencao.responsavel ?? '—'}</span>
              </span>
              <span className={estilos.eventoValor}>{moedaEmTexto(manutencao.valor)}</span>
              {podeGerir ? <span className={estilos.acoes}>{acoes(manutencao)}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
