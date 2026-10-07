import { useEffect, useRef } from 'react';

import { percentualEmTexto } from '@/compartilhado/formatacao/percentual';
import {
  IncluirProprietario,
  type CandidatoAoContrato,
} from '@/compartilhado/participacoes/IncluirProprietario';
import {
  situacaoDaSoma,
  somaDasParticipacoes,
  TAMANHO_DO_PERCENTUAL,
} from '@/compartilhado/participacoes/percentuais';
import { Botao } from '@/design-system/primitivos/Botao';
import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';
import { Texto } from '@/design-system/primitivos/Texto';

import estilos from './PainelDeDesativacao.module.css';
import {
  alterarPercentual,
  incluirParticipacao,
  removerParticipacao,
  type ContratoSemQuemSai,
} from './rebalanceamento';
import {
  campoDaSoma,
  campoDoPercentual,
  semNinguemNa,
  type CampoDaSaida,
} from './validacaoDaSaida';

interface ContratoDaSaidaProps {
  contrato: ContratoSemQuemSai;
  /** A posição do contrato no pedido — a mesma do `campos` que o servidor devolve. */
  indice: number;
  quemSai: string;
  nomes: Map<number, string>;
  /** Os ativos que podem entrar nesta aeronave: nem quem sai, nem quem já está nela. */
  candidatos: CandidatoAoContrato[];
  erroDe: (campo: CampoDaSaida) => string | undefined;
  aoMudar: (contrato: ContratoSemQuemSai) => void;
}

/** O campo de percentual de quem entrou, ou a escolha de quem incluir depois de uma remoção. */
type AlvoDoFoco = number | 'inclusao';

/**
 * O contrato novo de uma aeronave: os sócios que ficam, quem entra no lugar, e a soma que diz o que
 * falta. Só quem foi incluído aqui pode ser retirado — mexer nos sócios atuais é decisão do contrato
 * da aeronave, não da saída.
 */
export function ContratoDaSaida({
  contrato,
  indice,
  quemSai,
  nomes,
  candidatos,
  erroDe,
  aoMudar,
}: ContratoDaSaidaProps) {
  const camposDePercentual = useRef(new Map<number, HTMLInputElement>());
  const selecaoDeInclusao = useRef<HTMLSelectElement>(null);
  const focoPendente = useRef<AlvoDoFoco | null>(null);

  // Quem entra ou sai troca o que está na tela: o foco vai ao campo novo, ou volta à escolha.
  useEffect(() => {
    const alvo = focoPendente.current;
    if (alvo === null) {
      return;
    }
    focoPendente.current = null;
    (alvo === 'inclusao'
      ? selecaoDeInclusao.current
      : camposDePercentual.current.get(alvo)
    )?.focus();
  });

  const { matricula } = contrato;
  const textos = contrato.participacoes.map((participacao) => participacao.percentual);
  const situacao = situacaoDaSoma(textos, semNinguemNa(matricula));
  const erroDaSoma = erroDe(campoDaSoma(indice));

  return (
    <section className={estilos.aeronave} aria-label={`Contrato novo da ${matricula}`}>
      <div className={estilos.cabecalho}>
        <span className={estilos.matricula}>{matricula}</span>
        <Texto variante="apoio" tom="suave" como="span">
          {percentualEmTexto(contrato.liberado)} liberado
        </Texto>
      </div>

      {contrato.participacoes.map((participacao, posicao) => {
        const nome = nomes.get(participacao.proprietarioId) ?? '';
        return (
          <div key={participacao.proprietarioId} className={estilos.participacao}>
            <span className={estilos.nome}>{nome}</span>
            <span className={estilos.campo}>
              <CampoDeTexto
                rotulo={`Participação de ${nome} na ${matricula} em %`}
                rotuloOculto
                obrigatorio
                ref={(campo) => {
                  if (campo) {
                    camposDePercentual.current.set(participacao.proprietarioId, campo);
                  } else {
                    camposDePercentual.current.delete(participacao.proprietarioId);
                  }
                }}
                valor={participacao.percentual}
                inputMode="decimal"
                maxLength={TAMANHO_DO_PERCENTUAL}
                alinhamento="direita"
                erro={erroDe(campoDoPercentual(indice, posicao))}
                aoMudar={(valor) =>
                  aoMudar(alterarPercentual(contrato, participacao.proprietarioId, valor))
                }
              />
              <span className={estilos.unidade} aria-hidden="true">
                %
              </span>
            </span>
            {participacao.incluida ? (
              <Botao
                variante="fantasma"
                tamanho="pequeno"
                tom="critico"
                rotuloAcessivel={`Remover ${nome} do contrato da ${matricula}`}
                aoClicar={() => {
                  focoPendente.current = 'inclusao';
                  aoMudar(removerParticipacao(contrato, participacao.proprietarioId));
                }}
              >
                Remover
              </Botao>
            ) : null}
          </div>
        );
      })}

      {candidatos.length > 0 ? (
        <IncluirProprietario
          rotulo={`Incluir proprietário na ${matricula}`}
          rotuloDoBotao={`Incluir na ${matricula}`}
          candidatos={candidatos}
          ref={selecaoDeInclusao}
          aoIncluir={(proprietarioId) => {
            focoPendente.current = proprietarioId;
            aoMudar(incluirParticipacao(contrato, proprietarioId));
          }}
        />
      ) : contrato.participacoes.length === 0 ? (
        <Texto variante="apoio" tom="atencao" como="p">
          Não há outro proprietário ativo para assumir a {matricula}. Cancele, cadastre ou reative
          um proprietário nesta tela e volte a desativar {quemSai}.
        </Texto>
      ) : null}

      <p className={estilos.soma} role="status">
        <Texto
          variante="apoio"
          tom={erroDaSoma ? 'critico' : situacao.fecha ? 'positivo' : 'atencao'}
          como="span"
        >
          Soma {percentualEmTexto(somaDasParticipacoes(textos))} · {erroDaSoma ?? situacao.texto}
        </Texto>
      </p>
    </section>
  );
}
