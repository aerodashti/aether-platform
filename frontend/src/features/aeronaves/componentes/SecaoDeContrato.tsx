import { useEffect, useRef, useState } from 'react';

import { ErroDeApi } from '@/api/cliente';
import {
  competenciaAbreviada,
  contaNoFundo,
  saldoDaAeronave,
  useSaldosDoFundo,
} from '@/compartilhado/fundo/useSaldosDoFundo';
import { useProprietarios } from '@/compartilhado/proprietarios/useProprietarios';
import { juntarClasses } from '@/design-system/classes';
import { Botao } from '@/design-system/primitivos/Botao';
import { Esqueleto } from '@/design-system/primitivos/Esqueleto';
import { PontoDeCor, type CorDeIdentificacao } from '@/design-system/primitivos/SeletorDeCor';
import { Texto } from '@/design-system/primitivos/Texto';

import {
  useContratos,
  useDefinirContrato,
  type ContratoResponse,
  type DefinirContratoRequest,
} from '../api/useContratos';

import { CartaoDeSecao } from './CartaoDeSecao';
import { EdicaoDoContrato } from './EdicaoDoContrato';
import { HistoricoDeContratos } from './HistoricoDeContratos';
import { moedaEmTexto, percentualEmTexto, periodoDoContrato } from './rotulos';
import estilos from './SecaoDeContrato.module.css';

interface SecaoDeContratoProps {
  aeronaveId: number;
  podeGerir: boolean;
}

const CONFLITO = 409;

/**
 * O % do custo da competência que coube ao proprietário e o saldo dele no fundo, do fechamento.
 * Sem custo no mês, o % é "—": dividir zero não é 0%.
 */
function ColunasDoFundo({
  conta,
}: {
  conta: { saldo?: number; percentualNoRateio?: number } | undefined;
}) {
  const saldo = conta?.saldo ?? 0;
  return (
    <>
      <td role="cell" className={juntarClasses(estilos.celula, estilos.direita)}>
        <span className={estilos.percentual}>
          {conta?.percentualNoRateio == null ? '—' : percentualEmTexto(conta.percentualNoRateio)}
        </span>
      </td>
      <td role="cell" className={juntarClasses(estilos.celula, estilos.direita)}>
        <span className={juntarClasses(estilos.percentual, saldo < 0 && estilos.devedor)}>
          {moedaEmTexto(saldo)}
        </span>
      </td>
    </>
  );
}

function apoioDoContrato(vigente: ContratoResponse | undefined): string {
  return vigente
    ? `Contrato vigente · ${periodoDoContrato(vigente.inicioDaVigencia, vigente.fimDaVigencia)}`
    : 'Nenhum contrato definido para esta aeronave.';
}

/**
 * O contrato de participações, como no protótipo: o vigente numa tabela, a edição que cria um
 * contrato novo no mesmo lugar, e o histórico dos arquivados num segundo cartão. Fora da edição,
 * o % no rateio da competência e o saldo acumulado de cada um, do fechamento.
 *
 * <p>O salvar mora aqui, e não na edição: se outro contrato entrou em vigor enquanto a pessoa
 * editava (409), a edição recomeça do atual e o aviso do servidor continua à vista.
 */
export function SecaoDeContrato({ aeronaveId, podeGerir }: SecaoDeContratoProps) {
  const consulta = useContratos(aeronaveId);
  const definir = useDefinirContrato(aeronaveId);
  const proprietarios = useProprietarios();
  const saldos = useSaldosDoFundo();
  // A versão da edição aberta, que recomeça a cada 409; nula fora da edição.
  const [edicao, setEdicao] = useState<number | null>(null);
  const botaoAlterar = useRef<HTMLButtonElement>(null);
  const voltandoDaEdicao = useRef(false);

  const vigente = consulta.data?.vigente;
  const historico = consulta.data?.historico ?? [];

  // Sair da edição troca os botões do cabeçalho: o foco volta ao "Alterar", e não ao <body>.
  useEffect(() => {
    if (edicao === null && voltandoDaEdicao.current) {
      voltandoDaEdicao.current = false;
      botaoAlterar.current?.focus();
    }
  }, [edicao]);

  function comecarEdicao() {
    definir.reset();
    setEdicao(0);
  }

  function sairDaEdicao() {
    voltandoDaEdicao.current = true;
    setEdicao(null);
  }

  function salvar(pedido: DefinirContratoRequest) {
    definir.mutate(pedido, {
      onSuccess: sairDaEdicao,
      onError: (erro) => {
        if (erro instanceof ErroDeApi && erro.status === CONFLITO) {
          void consulta
            .refetch()
            .then(() => setEdicao((versao) => (versao === null ? null : versao + 1)));
        }
      },
    });
  }

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

  const cartaoDeHistorico =
    historico.length > 0 ? <HistoricoDeContratos historico={historico} /> : null;

  if (edicao !== null) {
    return (
      <>
        <EdicaoDoContrato
          key={edicao}
          vigente={vigente}
          apoio={apoioDoContrato(vigente)}
          proprietarios={proprietarios}
          falha={definir.error}
          enviando={definir.isPending}
          aoSalvar={salvar}
          aoCancelar={sairDaEdicao}
        />
        {cartaoDeHistorico}
      </>
    );
  }

  // As colunas do fundo só existem quando o fechamento já respondeu.
  const fundo = saldoDaAeronave(saldos.data, aeronaveId);

  return (
    <>
      <CartaoDeSecao
        titulo="Contrato de participações"
        apoio={
          consulta.isPending ? 'Quem é dono de quanto desta aeronave.' : apoioDoContrato(vigente)
        }
        acao={
          !consulta.isPending && podeGerir ? (
            <Botao variante="contorno" tamanho="medio" aoClicar={comecarEdicao} ref={botaoAlterar}>
              {vigente ? 'Alterar participações' : 'Definir participações'}
            </Botao>
          ) : null
        }
      >
        {consulta.isPending ? (
          <div className={estilos.vazio}>
            <div role="status" className={estilos.apenasLeitor}>
              Carregando o contrato…
            </div>
            <Esqueleto />
          </div>
        ) : !vigente ? (
          <div className={estilos.vazio}>
            <Texto variante="apoio" tom="suave" como="p">
              As participações definem quem é dono de quanto — e, com elas, o rateio dos custos.
            </Texto>
          </div>
        ) : (
          <div className={estilos.rolagem}>
            <table
              role="table"
              className={juntarClasses(estilos.tabela, fundo && estilos.comFundo)}
            >
              <thead role="rowgroup" className={estilos.bloco}>
                <tr role="row" className={estilos.linhaDeCabecalho}>
                  <th role="columnheader" scope="col">
                    Proprietário
                  </th>
                  <th role="columnheader" scope="col" className={estilos.direita}>
                    % de propriedade
                  </th>
                  {fundo ? (
                    <>
                      <th role="columnheader" scope="col" className={estilos.direita}>
                        % no rateio {competenciaAbreviada(fundo.competencia)}
                      </th>
                      <th role="columnheader" scope="col" className={estilos.direita}>
                        Saldo acumulado
                      </th>
                    </>
                  ) : null}
                </tr>
              </thead>
              <tbody role="rowgroup" className={estilos.bloco}>
                {(vigente.participacoes ?? []).map((participacao) => (
                  <tr role="row" key={participacao.proprietarioId} className={estilos.linha}>
                    <td role="cell" className={estilos.celula}>
                      <span className={estilos.dono}>
                        <PontoDeCor
                          cor={(participacao.corDeIdentificacao ?? 'CINZA') as CorDeIdentificacao}
                        />
                        <span className={estilos.trunca}>{participacao.nome}</span>
                      </span>
                    </td>
                    <td role="cell" className={juntarClasses(estilos.celula, estilos.direita)}>
                      <span className={estilos.percentual}>
                        {percentualEmTexto(participacao.percentual)}
                      </span>
                    </td>
                    {fundo ? (
                      <ColunasDoFundo
                        conta={contaNoFundo(saldos.data, aeronaveId, participacao.proprietarioId)}
                      />
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CartaoDeSecao>
      {cartaoDeHistorico}
    </>
  );
}
