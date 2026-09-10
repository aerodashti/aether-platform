import { useState } from 'react';

import { ErroDeApi } from '@/api/cliente';
import { useProprietarios } from '@/compartilhado/proprietarios/useProprietarios';
import { juntarClasses } from '@/design-system/classes';
import { Botao } from '@/design-system/primitivos/Botao';
import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';
import { Selecao } from '@/design-system/primitivos/Selecao';
import { PontoDeCor, type CorDeIdentificacao } from '@/design-system/primitivos/SeletorDeCor';
import { Texto } from '@/design-system/primitivos/Texto';

import { useContratos, useDefinirContrato, type ContratoResponse } from '../api/useContratos';

import {
  dataCompleta,
  dividirIgualmente,
  lerPercentual,
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

/**
 * O contrato de participações: o vigente em leitura, a edição que cria um contrato novo e o
 * histórico dos arquivados. As colunas de rateio e saldo do protótipo entram com o fechamento —
 * coluna vazia não existe.
 */
export function SecaoDeContrato({ aeronaveId, podeGerir }: SecaoDeContratoProps) {
  const consulta = useContratos(aeronaveId);
  const definir = useDefinirContrato(aeronaveId);
  const proprietarios = useProprietarios();
  const [linhas, setLinhas] = useState<LinhaDeEdicao[] | null>(null);
  const [historicoAberto, setHistoricoAberto] = useState(false);

  const vigente = consulta.data?.vigente;
  const historico = consulta.data?.historico ?? [];
  const editando = linhas !== null;

  function comecarEdicao() {
    setLinhas(
      (vigente?.participacoes ?? []).map((participacao) => ({
        proprietarioId: participacao.proprietarioId ?? 0,
        nome: participacao.nome ?? '',
        cor: (participacao.corDeIdentificacao ?? 'CINZA') as CorDeIdentificacao,
        percentual: String(participacao.percentual ?? ''),
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

  const soma = (linhas ?? []).reduce((total, linha) => {
    const valor = lerPercentual(linha.percentual);
    return Number.isNaN(valor) ? total : total + valor;
  }, 0);
  const somaFecha = Math.abs(soma - 100) < 0.005 && (linhas?.length ?? 0) > 0;

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
      <section className={estilos.secao} aria-label="Contrato de participações">
        <div className={estilos.recado} role="alert">
          <Texto variante="corpo" como="p">
            Não foi possível carregar o contrato de participações.
          </Texto>
          <Botao variante="secundario" tamanho="pequeno" aoClicar={() => void consulta.refetch()}>
            Tentar de novo
          </Botao>
        </div>
      </section>
    );
  }

  return (
    <section className={estilos.secao} aria-label="Contrato de participações">
      <div className={estilos.cabecalho}>
        <div>
          <Texto variante="legenda" tom="suave" como="h2">
            Contrato vigente
          </Texto>
          <Texto variante="apoio" tom="suave" como="p">
            {vigente
              ? periodoDoContrato(vigente.inicioDaVigencia, vigente.fimDaVigencia)
              : 'Nenhum contrato definido para esta aeronave.'}
          </Texto>
        </div>
        {podeGerir && !editando ? (
          <Botao variante="secundario" tamanho="pequeno" aoClicar={comecarEdicao}>
            {vigente ? 'Alterar participações' : 'Definir participações'}
          </Botao>
        ) : null}
        {editando ? (
          <div className={estilos.acoesDeEdicao}>
            <Botao variante="secundario" tamanho="pequeno" aoClicar={() => setLinhas(null)}>
              Cancelar
            </Botao>
            <Botao
              tamanho="pequeno"
              aoClicar={salvar}
              desabilitado={!somaFecha}
              carregando={definir.isPending}
            >
              Salvar novo contrato
            </Botao>
          </div>
        ) : null}
      </div>

      {!editando ? (
        <ul className={estilos.lista}>
          {(vigente?.participacoes ?? []).map((participacao) => (
            <li key={participacao.proprietarioId} className={estilos.linha}>
              <span className={estilos.dono}>
                <PontoDeCor
                  cor={(participacao.corDeIdentificacao ?? 'CINZA') as CorDeIdentificacao}
                />
                <span className={estilos.trunca}>{participacao.nome}</span>
              </span>
              <span className={estilos.barra} aria-hidden="true">
                <span
                  className={estilos.preenchimento}
                  style={{ width: `${participacao.percentual ?? 0}%` }}
                />
              </span>
              <span className={estilos.percentual}>
                {percentualEmTexto(participacao.percentual)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className={estilos.edicao}>
          <ul className={estilos.lista}>
            {(linhas ?? []).map((linha) => (
              <li key={linha.proprietarioId} className={estilos.linha}>
                <span className={estilos.dono}>
                  <PontoDeCor cor={linha.cor} />
                  <span className={estilos.trunca}>{linha.nome}</span>
                </span>
                <span className={estilos.campoDePercentual}>
                  <CampoDeTexto
                    rotulo={`Participação de ${linha.nome} em %`}
                    rotuloOculto
                    valor={linha.percentual}
                    inputMode="numeric"
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
                <Botao
                  variante="fantasma"
                  tamanho="pequeno"
                  tom="critico"
                  rotuloAcessivel={`Remover ${linha.nome} do contrato`}
                  aoClicar={() =>
                    setLinhas((atuais) =>
                      (atuais ?? []).filter((cada) => cada.proprietarioId !== linha.proprietarioId),
                    )
                  }
                >
                  Remover
                </Botao>
              </li>
            ))}
          </ul>

          {disponiveis.length > 0 ? (
            <div className={estilos.adicionar}>
              <Selecao
                rotulo="Adicionar proprietário ao contrato"
                valor=""
                opcoes={[
                  { valor: '', rotulo: 'Adicionar proprietário…' },
                  ...disponiveis.map((dono) => ({
                    valor: String(dono.id),
                    rotulo: dono.nome ?? '',
                  })),
                ]}
                aoMudar={adicionar}
                rotuloOculto
              />
            </div>
          ) : (
            <Texto variante="apoio" tom="suave" como="p">
              Todos os proprietários cadastrados já estão neste contrato.
            </Texto>
          )}

          <div className={estilos.rodapeDeEdicao}>
            <Texto variante="corpo" tom={somaFecha ? 'positivo' : 'atencao'} como="span">
              Soma Σ {percentualEmTexto(Math.round(soma * 100) / 100)}
            </Texto>
            <Botao
              variante="fantasma"
              tamanho="pequeno"
              aoClicar={() =>
                setLinhas((atuais) => {
                  const fatias = dividirIgualmente(atuais?.length ?? 0);
                  return (atuais ?? []).map((cada, indice) => ({
                    ...cada,
                    percentual: String(fatias[indice] ?? ''),
                  }));
                })
              }
            >
              Dividir igualmente
            </Botao>
          </div>
          {erro ? (
            <div role="alert">
              <Texto variante="apoio" tom="critico" como="p">
                {erro}
              </Texto>
            </div>
          ) : null}
          <Texto variante="apoio" tom="suave" como="p">
            O contrato atual será arquivado no histórico.
          </Texto>
        </div>
      )}

      {historico.length > 0 ? (
        <div className={estilos.historico}>
          <Botao
            variante="fantasma"
            tamanho="pequeno"
            aoClicar={() => setHistoricoAberto((aberto) => !aberto)}
          >
            {historicoAberto
              ? 'Esconder histórico'
              : `Histórico de contratos (${historico.length})`}
          </Botao>
          {historicoAberto
            ? historico.map((contrato) => (
                <ContratoArquivado key={contrato.id} contrato={contrato} />
              ))
            : null}
        </div>
      ) : null}
    </section>
  );
}

function ContratoArquivado({ contrato }: { contrato: ContratoResponse }) {
  return (
    <div className={estilos.arquivado}>
      <div className={estilos.arquivadoCabecalho}>
        <Texto variante="corpo" como="span">
          {periodoDoContrato(contrato.inicioDaVigencia, contrato.fimDaVigencia)}
        </Texto>
        <Texto variante="apoio" tom="suave" como="span">
          Arquivado em {dataCompleta(contrato.fimDaVigencia)} · criado por {contrato.criadoPor}
        </Texto>
      </div>
      <ul className={juntarClasses(estilos.lista, estilos.listaCompacta)}>
        {(contrato.participacoes ?? []).map((participacao) => (
          <li key={participacao.proprietarioId} className={estilos.linha}>
            <span className={estilos.dono}>
              <PontoDeCor
                cor={(participacao.corDeIdentificacao ?? 'CINZA') as CorDeIdentificacao}
              />
              <span className={estilos.trunca}>{participacao.nome}</span>
            </span>
            <span className={estilos.percentual}>{percentualEmTexto(participacao.percentual)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
