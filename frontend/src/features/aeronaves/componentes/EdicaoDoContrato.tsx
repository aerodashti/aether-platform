import type { UseQueryResult } from '@tanstack/react-query';
import { useEffect, useId, useRef, useState } from 'react';

import { percentualEmTexto } from '@/compartilhado/formatacao/percentual';
import { ResumoDoFormulario } from '@/compartilhado/formulario/ResumoDoFormulario';
import { useValidacao } from '@/compartilhado/formulario/useValidacao';
import { IncluirProprietario } from '@/compartilhado/participacoes/IncluirProprietario';
import {
  situacaoDaSoma,
  somaDasParticipacoes,
  TAMANHO_DO_PERCENTUAL,
} from '@/compartilhado/participacoes/percentuais';
import type { ProprietarioResponse } from '@/compartilhado/proprietarios/useProprietarios';
import { juntarClasses } from '@/design-system/classes';
import { Botao } from '@/design-system/primitivos/Botao';
import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';
import { LinkDeTexto } from '@/design-system/primitivos/LinkDeTexto';
import { PontoDeCor } from '@/design-system/primitivos/SeletorDeCor';
import { Texto } from '@/design-system/primitivos/Texto';

import type { ContratoResponse, DefinirContratoRequest } from '../api/useContratos';

import { CartaoDeSecao } from './CartaoDeSecao';
import {
  alterarPercentual,
  consequenciaDoSalvar,
  dividirEntreTodos,
  incluirLinha,
  linhasDoVigente,
  mudaOContrato,
  pedidoDoContrato,
  removerLinha,
  vizinhaDaRemovida,
  type LinhaDoContrato,
} from './contratoEmEdicao';
import estilos from './SecaoDeContrato.module.css';
import {
  campoDoContratoNoServidor,
  campoDoPercentual,
  rotulosDoContrato,
  SEM_PROPRIETARIO,
  validarContrato,
  valoresDoContrato,
  type CampoDoContrato,
} from './validacaoDoContrato';

interface EdicaoDoContratoProps {
  /** O vigente que a edição tem à vista; o pedido diz ao servidor que partiu dele. */
  vigente: ContratoResponse | undefined;
  /** A linha de apoio do cartão, a mesma de fora da edição. */
  apoio: string;
  proprietarios: UseQueryResult<ProprietarioResponse[]>;
  /** O erro do último salvar. Mora na seção para sobreviver à edição que recomeça num 409. */
  falha: unknown;
  enviando: boolean;
  aoSalvar: (pedido: DefinirContratoRequest) => void;
  aoCancelar: () => void;
}

/** O campo de percentual de uma linha, ou a escolha de quem incluir quando não sobra linha. */
type AlvoDoFoco = number | 'inclusao';

/**
 * A edição que cria um contrato novo, na mesma tabela do vigente. A regra é de
 * `validacaoDoContrato`; daqui saem só o rascunho, o foco e a ligação com `useValidacao`.
 */
export function EdicaoDoContrato({
  vigente,
  apoio,
  proprietarios,
  falha,
  enviando,
  aoSalvar,
  aoCancelar,
}: EdicaoDoContratoProps) {
  // A foto de quando a edição abriu: uma recarga da consulta não pode trocar a base por baixo.
  const [base] = useState(vigente);
  const [linhas, setLinhas] = useState(() => linhasDoVigente(vigente));
  const [anuncio, setAnuncio] = useState('');
  const idDoResumo = useId();
  const camposDePercentual = useRef(new Map<number, HTMLInputElement>());
  const selecaoDeInclusao = useRef<HTMLSelectElement>(null);
  const botaoCancelar = useRef<HTMLButtonElement>(null);
  // Linha que entra, sai ou a edição que abre: o botão que tinha o foco sai do DOM. O foco vai ao
  // campo que pede atenção, e nunca cai no <body>.
  const focoPendente = useRef<AlvoDoFoco | null>(linhas[0]?.proprietarioId ?? 'inclusao');

  useEffect(() => {
    const alvo = focoPendente.current;
    if (alvo === null) {
      return;
    }
    focoPendente.current = null;
    const campo =
      alvo === 'inclusao' ? selecaoDeInclusao.current : camposDePercentual.current.get(alvo);
    (campo ?? botaoCancelar.current)?.focus();
  });

  const validacao = useValidacao<CampoDoContrato>({
    erros: validarContrato(linhas),
    valores: valoresDoContrato(linhas),
    rotulos: rotulosDoContrato(linhas),
    falha,
    campoDoServidor: (nome) => campoDoContratoNoServidor(nome, linhas.length),
  });

  const candidatos = (proprietarios.data ?? []).filter(
    (proprietario) =>
      proprietario.situacao === 'ATIVO' &&
      !linhas.some((linha) => linha.proprietarioId === proprietario.id),
  );

  function incluir(proprietarioId: number) {
    const proprietario = candidatos.find((candidato) => candidato.id === proprietarioId);
    if (proprietario) {
      focoPendente.current = proprietarioId;
      setLinhas((atuais) => incluirLinha(atuais, proprietario));
    }
  }

  function remover(linha: LinhaDoContrato) {
    focoPendente.current = vizinhaDaRemovida(linhas, linha.proprietarioId) ?? 'inclusao';
    setLinhas((atuais) => removerLinha(atuais, linha.proprietarioId));
    setAnuncio(`${linha.nome} saiu do contrato em edição.`);
  }

  /** Sem mudança não há o que arquivar: salvar fecha a edição sem ir ao servidor. */
  function salvar() {
    if (mudaOContrato(linhas, base)) {
      aoSalvar(pedidoDoContrato(linhas, base));
    } else {
      aoCancelar();
    }
  }

  const textos = linhas.map((linha) => linha.percentual);
  const situacao = situacaoDaSoma(textos, SEM_PROPRIETARIO);
  const erroDaSoma = validacao.erroDe('participacoes');
  const tomDaSoma = erroDaSoma ? 'critico' : situacao.fecha ? 'positivo' : 'atencao';

  return (
    <CartaoDeSecao
      titulo="Contrato de participações"
      apoio={apoio}
      acao={
        <>
          <Botao
            variante="secundario"
            tamanho="medio"
            ref={botaoCancelar}
            desabilitado={enviando}
            aoClicar={aoCancelar}
          >
            Cancelar
          </Botao>
          <Botao
            tamanho="medio"
            carregando={enviando}
            descritoPor={idDoResumo}
            aoClicar={() => validacao.enviar(salvar)}
          >
            Salvar novo contrato
          </Botao>
        </>
      }
    >
      <div ref={validacao.refDoFormulario}>
        {linhas.length > 0 ? (
          <div className={estilos.rolagem}>
            <table role="table" className={juntarClasses(estilos.tabela, estilos.editando)}>
              <thead role="rowgroup" className={estilos.bloco}>
                <tr role="row" className={estilos.linhaDeCabecalho}>
                  <th role="columnheader" scope="col">
                    Proprietário
                  </th>
                  <th role="columnheader" scope="col" className={estilos.direita}>
                    % de propriedade
                  </th>
                  <th role="columnheader" scope="col" className={estilos.apenasLeitor}>
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody role="rowgroup" className={estilos.bloco}>
                {linhas.map((linha, indice) => (
                  <tr role="row" key={linha.proprietarioId} className={estilos.linha}>
                    <td role="cell" className={estilos.celula}>
                      <span className={estilos.dono}>
                        <PontoDeCor cor={linha.cor} />
                        <span className={estilos.trunca}>{linha.nome}</span>
                      </span>
                    </td>
                    <td role="cell" className={juntarClasses(estilos.celula, estilos.campo)}>
                      <span className={estilos.campoDePercentual}>
                        <CampoDeTexto
                          rotulo={`Participação de ${linha.nome} em %`}
                          rotuloOculto
                          obrigatorio
                          ref={(campo) => {
                            if (campo) {
                              camposDePercentual.current.set(linha.proprietarioId, campo);
                            } else {
                              camposDePercentual.current.delete(linha.proprietarioId);
                            }
                          }}
                          valor={linha.percentual}
                          inputMode="decimal"
                          maxLength={TAMANHO_DO_PERCENTUAL}
                          alinhamento="direita"
                          erro={validacao.erroDe(campoDoPercentual(indice))}
                          aoMudar={(valor) =>
                            setLinhas((atuais) =>
                              alterarPercentual(atuais, linha.proprietarioId, valor),
                            )
                          }
                        />
                      </span>
                      <span className={estilos.unidade} aria-hidden="true">
                        %
                      </span>
                    </td>
                    <td role="cell" className={juntarClasses(estilos.celula, estilos.acoes)}>
                      <Botao
                        variante="fantasma"
                        tamanho="pequeno"
                        tom="critico"
                        rotuloAcessivel={`Remover ${linha.nome} do contrato`}
                        aoClicar={() => remover(linha)}
                      >
                        Remover
                      </Botao>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        <div role="status" className={estilos.apenasLeitor}>
          {anuncio}
        </div>

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
          ) : candidatos.length > 0 ? (
            <div className={estilos.caixaDeAdicao}>
              <span className={estilos.mais} aria-hidden="true">
                +
              </span>
              <div className={estilos.caixaTexto}>
                <span className={estilos.caixaTitulo}>Adicionar proprietário ao contrato</span>
                <Texto variante="apoio" tom="suave" como="p">
                  Escolha um proprietário ativo e inclua; o percentual dele começa vazio.
                </Texto>
              </div>
              <div className={estilos.selecao}>
                <IncluirProprietario
                  rotulo="Adicionar proprietário ao contrato"
                  rotuloDoBotao="Incluir no contrato"
                  candidatos={candidatos.map((candidato) => ({
                    id: candidato.id ?? 0,
                    nome: candidato.nome ?? '',
                  }))}
                  aoIncluir={incluir}
                  ref={selecaoDeInclusao}
                />
              </div>
            </div>
          ) : (
            <div className={estilos.caixaCheia}>
              <SemQuemIncluir cadastrados={proprietarios.data} linhas={linhas} />
            </div>
          )}
        </div>

        <div className={estilos.faixaDaSoma}>
          <span className={estilos.somaRotulo}>Soma</span>
          <Texto variante="corpo" tom={tomDaSoma} como="span">
            <strong>Σ {percentualEmTexto(somaDasParticipacoes(textos))}</strong>
          </Texto>
          <span className={estilos.somaTexto} role="status">
            <Texto variante="apoio" tom={tomDaSoma} como="span">
              {erroDaSoma ??
                consequenciaDoSalvar(situacao, mudaOContrato(linhas, base), base !== undefined)}
            </Texto>
          </span>
          <Botao variante="contorno" tamanho="medio" aoClicar={() => setLinhas(dividirEntreTodos)}>
            Dividir igualmente
          </Botao>
        </div>
        <div className={estilos.resumo}>
          <ResumoDoFormulario id={idDoResumo} resumo={validacao.resumo} />
        </div>
      </div>
    </CartaoDeSecao>
  );
}

/**
 * Por que não há quem incluir, e o caminho para haver: cadastrar alguém, ou reativar quem está
 * inativo. "Todos já estão no contrato" seria mentira para quem tem um sócio inativo fora dele.
 */
function SemQuemIncluir({
  cadastrados,
  linhas,
}: {
  cadastrados: ProprietarioResponse[];
  linhas: LinhaDoContrato[];
}) {
  const proprietarios = <LinkDeTexto para="/proprietarios">Proprietários</LinkDeTexto>;
  if (cadastrados.length === 0) {
    return <>Nenhum proprietário cadastrado. Cadastre um em {proprietarios}.</>;
  }
  const inativosDeFora = cadastrados.filter(
    (proprietario) =>
      proprietario.situacao !== 'ATIVO' &&
      !linhas.some((linha) => linha.proprietarioId === proprietario.id),
  );
  if (inativosDeFora.length > 0) {
    const nomes = inativosDeFora.map((proprietario) => proprietario.nome).join(', ');
    return (
      <>
        Todos os proprietários ativos já estão neste contrato. Para incluir {nomes}, reative o
        cadastro em {proprietarios}.
      </>
    );
  }
  return <>Todos os proprietários cadastrados já estão neste contrato.</>;
}
