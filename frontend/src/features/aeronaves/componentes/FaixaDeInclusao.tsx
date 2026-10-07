import type { UseQueryResult } from '@tanstack/react-query';
import type { RefObject } from 'react';

import {
  IncluirProprietario,
  type CandidatoAoContrato,
} from '@/compartilhado/participacoes/IncluirProprietario';
import type { ProprietarioResponse } from '@/compartilhado/proprietarios/useProprietarios';
import { Botao } from '@/design-system/primitivos/Botao';
import { LinkDeTexto } from '@/design-system/primitivos/LinkDeTexto';
import { Texto } from '@/design-system/primitivos/Texto';

import { semCandidatos, type LinhaDoContrato } from './contratoEmEdicao';
import estilos from './SecaoDeContrato.module.css';

interface FaixaDeInclusaoProps {
  proprietarios: UseQueryResult<ProprietarioResponse[]>;
  candidatos: CandidatoAoContrato[];
  linhas: LinhaDoContrato[];
  selecao: RefObject<HTMLSelectElement | null>;
  aoIncluir: (proprietarioId: number) => void;
}

/** A caixa tracejada de incluir alguém no contrato, ou por que não há quem incluir. */
export function FaixaDeInclusao({
  proprietarios,
  candidatos,
  linhas,
  selecao,
  aoIncluir,
}: FaixaDeInclusaoProps) {
  return (
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
              candidatos={candidatos}
              aoIncluir={aoIncluir}
              ref={selecao}
            />
          </div>
        </div>
      ) : (
        <div className={estilos.caixaCheia}>
          <SemQuemIncluir cadastrados={proprietarios.data} linhas={linhas} />
        </div>
      )}
    </div>
  );
}

function SemQuemIncluir({
  cadastrados,
  linhas,
}: {
  cadastrados: ProprietarioResponse[];
  linhas: LinhaDoContrato[];
}) {
  const proprietarios = <LinkDeTexto para="/proprietarios">Proprietários</LinkDeTexto>;
  const situacao = semCandidatos(cadastrados, linhas);
  switch (situacao.motivo) {
    case 'nenhumCadastrado':
      return <>Nenhum proprietário cadastrado. Cadastre um em {proprietarios}.</>;
    case 'inativosDeFora':
      return (
        <>
          Todos os proprietários ativos já estão neste contrato. Para incluir {situacao.nomes},
          reative o cadastro em {proprietarios}.
        </>
      );
    case 'todosNoContrato':
      return <>Todos os proprietários cadastrados já estão neste contrato.</>;
  }
}
