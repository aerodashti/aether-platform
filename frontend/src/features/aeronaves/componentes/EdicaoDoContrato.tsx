import type { UseQueryResult } from '@tanstack/react-query';
import { useEffect, useId, useRef, useState } from 'react';

import { ResumoDoFormulario } from '@/compartilhado/formulario/ResumoDoFormulario';
import { useValidacao } from '@/compartilhado/formulario/useValidacao';
import { candidatosAoContrato } from '@/compartilhado/participacoes/candidatos';
import { situacaoDaSoma, somaDasParticipacoes } from '@/compartilhado/participacoes/percentuais';
import type { ProprietarioResponse } from '@/compartilhado/proprietarios/useProprietarios';
import { Botao } from '@/design-system/primitivos/Botao';

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
import { FaixaDaSoma } from './FaixaDaSoma';
import { FaixaDeInclusao } from './FaixaDeInclusao';
import estilos from './SecaoDeContrato.module.css';
import { TabelaDaEdicao } from './TabelaDaEdicao';
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

  const candidatos = candidatosAoContrato(
    proprietarios.data ?? [],
    linhas.map((linha) => linha.proprietarioId),
  );

  function incluir(proprietarioId: number) {
    const proprietario = proprietarios.data?.find((dono) => dono.id === proprietarioId);
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

  function registrarCampo(proprietarioId: number, campo: HTMLInputElement | null) {
    if (campo) {
      camposDePercentual.current.set(proprietarioId, campo);
    } else {
      camposDePercentual.current.delete(proprietarioId);
    }
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
          <TabelaDaEdicao
            linhas={linhas}
            erroDaLinha={(indice) => validacao.erroDe(campoDoPercentual(indice))}
            registrarCampo={registrarCampo}
            aoMudarPercentual={(proprietarioId, valor) =>
              setLinhas((atuais) => alterarPercentual(atuais, proprietarioId, valor))
            }
            aoRemover={remover}
          />
        ) : null}
        <div role="status" className={estilos.apenasLeitor}>
          {anuncio}
        </div>
        <FaixaDeInclusao
          proprietarios={proprietarios}
          candidatos={candidatos}
          linhas={linhas}
          selecao={selecaoDeInclusao}
          aoIncluir={incluir}
        />
        <FaixaDaSoma
          soma={somaDasParticipacoes(textos)}
          frase={
            erroDaSoma ??
            consequenciaDoSalvar(situacao, mudaOContrato(linhas, base), base !== undefined)
          }
          tom={tomDaSoma}
          aoDividir={() => setLinhas(dividirEntreTodos)}
        />
        <div className={estilos.resumo}>
          <ResumoDoFormulario id={idDoResumo} resumo={validacao.resumo} />
        </div>
      </div>
    </CartaoDeSecao>
  );
}
