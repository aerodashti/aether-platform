import { useState } from 'react';

import { ErroDeApi } from '@/api/cliente';
import { useProprietarios } from '@/compartilhado/proprietarios/useProprietarios';
import { juntarClasses } from '@/design-system/classes';
import { Botao } from '@/design-system/primitivos/Botao';
import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';
import { Esqueleto } from '@/design-system/primitivos/Esqueleto';
import { Selecao } from '@/design-system/primitivos/Selecao';
import { PontoDeCor, type CorDeIdentificacao } from '@/design-system/primitivos/SeletorDeCor';
import { Texto } from '@/design-system/primitivos/Texto';

import { useContratos, useDefinirContrato, type ContratoResponse } from '../api/useContratos';

import { CartaoDeSecao } from './CartaoDeSecao';
import { HistoricoDeContratos } from './HistoricoDeContratos';
import {
  dividirIgualmente,
  lerPercentual,
  mensagemDaSoma,
  percentualEmTexto,
  periodoDoContrato,
} from './rotulos';
import estilos from './SecaoDeContrato.module.css';

interface SecaoDeContratoProps {
  aeronaveId: number;
  podeGerir: boolean;
}

interface LinhaDeEdicao {
  proprietarioId: number;
  nome: string;
  cor: CorDeIdentificacao;
  percentual: string;
}

/** O número como a pessoa o digita: com vírgula, sem zeros à direita. */
function percentualParaCampo(percentual: number | undefined): string {
  return percentual == null ? '' : String(percentual).replace('.', ',');
}

/** Mesmos proprietários com os mesmos percentuais (duas casas) — um contrato idêntico não arquiva nada. */
function mesmasParticipacoes(linhas: LinhaDeEdicao[], vigente: ContratoResponse | undefined) {
  const atuais = vigente?.participacoes ?? [];
  if (atuais.length !== linhas.length) {
    return false;
  }
  return linhas.every((linha) =>
    atuais.some(
      (participacao) =>
        participacao.proprietarioId === linha.proprietarioId &&
        Math.round((participacao.percentual ?? 0) * 100) ===
          Math.round(lerPercentual(linha.percentual) * 100),
    ),
  );
}

/**
 * O contrato de participações, como no protótipo: o vigente numa tabela, a edição que cria um
 * contrato novo na mesma tabela, e o histórico dos arquivados num segundo cartão. As colunas de
 * rateio e saldo acumulado entram com o fechamento — coluna vazia não existe.
 */
export function SecaoDeContrato({ aeronaveId, podeGerir }: SecaoDeContratoProps) {
  const consulta = useContratos(aeronaveId);
  const definir = useDefinirContrato(aeronaveId);
  const proprietarios = useProprietarios();
  const [linhas, setLinhas] = useState<LinhaDeEdicao[] | null>(null);

  const vigente = consulta.data?.vigente;
  const historico = consulta.data?.historico ?? [];
  const editando = linhas !== null;

  function comecarEdicao() {
    setLinhas(
      (vigente?.participacoes ?? []).map((participacao) => ({
        proprietarioId: participacao.proprietarioId ?? 0,
        nome: participacao.nome ?? '',
        cor: (participacao.corDeIdentificacao ?? 'CINZA') as CorDeIdentificacao,
        percentual: percentualParaCampo(participacao.percentual),
      })),
    );
    definir.reset();
  }

  function salvar() {
    if (!linhas) {
      return;
    }
    definir.mutate(
      {
        participacoes: linhas.map((linha) => ({
          proprietarioId: linha.proprietarioId,
          percentual: lerPercentual(linha.percentual),
        })),
      },
      { onSuccess: () => setLinhas(null) },
    );
  }

  const percentuais = (linhas ?? []).map((linha) => lerPercentual(linha.percentual));
  const soma = percentuais.reduce(
    (total, valor) => (Number.isNaN(valor) ? total : total + valor),
    0,
  );
  const resumo = mensagemDaSoma(percentuais, !mesmasParticipacoes(linhas ?? [], vigente));
  const podeSalvar = resumo.tom === 'positivo';

  /** Ativos que ainda não estão no contrato em edição. */
  const disponiveis = (proprietarios.data ?? []).filter(
    (proprietario) =>
      proprietario.situacao === 'ATIVO' &&
      !(linhas ?? []).some((linha) => linha.proprietarioId === proprietario.id),
  );

  function adicionar(idEscolhido: string) {
    const proprietario = disponiveis.find((dono) => String(dono.id) === idEscolhido);
    if (!proprietario) {
      return;
    }
    setLinhas((atuais) => [
      ...(atuais ?? []),
      {
        proprietarioId: proprietario.id ?? 0,
        nome: proprietario.nome ?? '',
        cor: (proprietario.corDeIdentificacao ?? 'CINZA') as CorDeIdentificacao,
        percentual: '',
      },
    ]);
  }

  const erro = definir.error instanceof ErroDeApi ? definir.error.message : undefined;

  if (consulta.isError) {
    return (
      <CartaoDeSecao titulo="Contrato de participações">
        <div className={estilos.recado} role="alert">
          <Texto variante="corpo" como="p">
            Não foi possível carregar o contrato de participações.
          </Texto>
          <Botao variante="secundario" tamanho="pequeno" aoClicar={() => void consulta.refetch()}>
            Tentar de novo
          </Botao>
        </div>
      </CartaoDeSecao>
    );
  }

  const acao = consulta.isPending ? null : editando ? (
    <>
      <Botao variante="secundario" tamanho="medio" aoClicar={() => setLinhas(null)}>
        Cancelar
      </Botao>
      <Botao
        tamanho="medio"
        aoClicar={salvar}
        desabilitado={!podeSalvar}
        carregando={definir.isPending}
      >
        Salvar novo contrato
      </Botao>
    </>
  ) : podeGerir ? (
    <Botao variante="contorno" tamanho="medio" aoClicar={comecarEdicao}>
      {vigente ? 'Alterar participações' : 'Definir participações'}
    </Botao>
  ) : null;

  return (
    <>
      <CartaoDeSecao
        titulo="Contrato de participações"
        apoio={
          consulta.isPending
            ? 'Quem é dono de quanto desta aeronave.'
            : vigente
              ? `Contrato vigente · ${periodoDoContrato(vigente.inicioDaVigencia, vigente.fimDaVigencia)}`
              : 'Nenhum contrato definido para esta aeronave.'
        }
        acao={acao}
      >
        {consulta.isPending ? (
          <div className={estilos.vazio}>
            <div role="status" className={estilos.apenasLeitor}>
              Carregando o contrato…
            </div>
            <Esqueleto />
          </div>
        ) : !editando && !vigente ? (
          <div className={estilos.vazio}>
            <Texto variante="apoio" tom="suave" como="p">
              As participações definem quem é dono de quanto — e, com elas, o rateio dos custos.
            </Texto>
          </div>
        ) : (
          <div className={estilos.rolagem}>
            <table className={juntarClasses(estilos.tabela, editando && estilos.editando)}>
              <thead className={estilos.bloco}>
                <tr className={estilos.linhaDeCabecalho}>
                  <th scope="col">Proprietário</th>
                  <th scope="col" className={estilos.direita}>
                    % de propriedade
                  </th>
                  {editando ? (
                    <th scope="col" className={estilos.apenasLeitor}>
                      Ações
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody className={estilos.bloco}>
                {!editando
                  ? (vigente?.participacoes ?? []).map((participacao) => (
                      <tr key={participacao.proprietarioId} className={estilos.linha}>
                        <td className={estilos.celula}>
                          <span className={estilos.dono}>
                            <PontoDeCor
                              cor={
                                (participacao.corDeIdentificacao ?? 'CINZA') as CorDeIdentificacao
                              }
                            />
                            <span className={estilos.trunca}>{participacao.nome}</span>
                          </span>
                        </td>
                        <td className={juntarClasses(estilos.celula, estilos.direita)}>
                          <span className={estilos.percentual}>
                            {percentualEmTexto(participacao.percentual)}
                          </span>
                        </td>
                      </tr>
                    ))
                  : (linhas ?? []).map((linha) => (
                      <tr key={linha.proprietarioId} className={estilos.linha}>
                        <td className={estilos.celula}>
                          <span className={estilos.dono}>
                            <PontoDeCor cor={linha.cor} />
                            <span className={estilos.trunca}>{linha.nome}</span>
                          </span>
                        </td>
                        <td className={juntarClasses(estilos.celula, estilos.campo)}>
                          <span className={estilos.campoDePercentual}>
                            <CampoDeTexto
                              rotulo={`Participação de ${linha.nome} em %`}
                              rotuloOculto
                              valor={linha.percentual}
                              inputMode="decimal"
                              alinhamento="direita"
                              aoMudar={(valor) =>
                                setLinhas((atuais) =>
                                  (atuais ?? []).map((cada) =>
                                    cada.proprietarioId === linha.proprietarioId
                                      ? { ...cada, percentual: valor }
                                      : cada,
                                  ),
                                )
                              }
                            />
                          </span>
                          <span className={estilos.unidade}>%</span>
                        </td>
                        <td className={juntarClasses(estilos.celula, estilos.acoes)}>
                          <Botao
                            variante="fantasma"
                            tamanho="pequeno"
                            tom="critico"
                            rotuloAcessivel={`Remover ${linha.nome} do contrato`}
                            aoClicar={() =>
                              setLinhas((atuais) =>
                                (atuais ?? []).filter(
                                  (cada) => cada.proprietarioId !== linha.proprietarioId,
                                ),
                              )
                            }
                          >
                            Remover
                          </Botao>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        )}

        {editando ? (
          <>
            <div className={estilos.faixaDeAdicao}>
              {proprietarios.isError ? (
                <div className={estilos.caixaCheia} role="alert">
                  Não foi possível carregar os proprietários.{' '}
                  <Botao
                    variante="fantasma"
                    tamanho="pequeno"
                    aoClicar={() => void proprietarios.refetch()}
                  >
                    Tentar de novo
                  </Botao>
                </div>
              ) : proprietarios.isPending ? (
                <div className={estilos.caixaCheia} role="status">
                  Carregando os proprietários…
                </div>
              ) : disponiveis.length > 0 ? (
                <div className={estilos.caixaDeAdicao}>
                  <span className={estilos.mais} aria-hidden="true">
                    +
                  </span>
                  <div className={estilos.caixaTexto}>
                    <span className={estilos.caixaTitulo}>Adicionar proprietário ao contrato</span>
                    <Texto variante="apoio" tom="suave" como="p">
                      Escolha um proprietário já cadastrado para incluir a participação.
                    </Texto>
                  </div>
                  <div className={estilos.selecao}>
                    <Selecao
                      rotulo="Adicionar proprietário ao contrato"
                      rotuloOculto
                      valor=""
                      opcoes={[
                        { valor: '', rotulo: 'Selecione…' },
                        ...disponiveis.map((dono) => ({
                          valor: String(dono.id),
                          rotulo: dono.nome ?? '',
                        })),
                      ]}
                      aoMudar={adicionar}
                    />
                  </div>
                </div>
              ) : (
                <div className={estilos.caixaCheia}>
                  Todos os proprietários cadastrados já estão neste contrato.
                </div>
              )}
            </div>
            <div className={estilos.faixaDaSoma}>
              <span className={estilos.somaRotulo}>Soma</span>
              <Texto variante="corpo" tom={resumo.tom} como="span">
                <strong>Σ {percentualEmTexto(Math.round(soma * 100) / 100)}</strong>
              </Texto>
              {/* A mensagem é o único motivo de o salvar estar desabilitado: precisa ser lida. */}
              <span className={estilos.somaTexto} role="status">
                <Texto variante="apoio" tom={resumo.tom} como="span">
                  {resumo.texto} O contrato atual será arquivado no histórico.
                </Texto>
              </span>
              <Botao
                variante="contorno"
                tamanho="medio"
                aoClicar={() =>
                  setLinhas((atuais) => {
                    const fatias = dividirIgualmente(atuais?.length ?? 0);
                    return (atuais ?? []).map((cada, indice) => ({
                      ...cada,
                      percentual: percentualParaCampo(fatias[indice]),
                    }));
                  })
                }
              >
                Dividir igualmente
              </Botao>
            </div>
            {erro ? (
              <div role="alert" className={estilos.erro}>
                <Texto variante="apoio" tom="critico" como="p">
                  {erro}
                </Texto>
              </div>
            ) : null}
          </>
        ) : null}
      </CartaoDeSecao>

      {historico.length > 0 ? <HistoricoDeContratos historico={historico} /> : null}
    </>
  );
}
