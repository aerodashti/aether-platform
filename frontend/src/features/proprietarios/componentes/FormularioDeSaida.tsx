import { useId, useState } from 'react';

import { ResumoDoFormulario } from '@/compartilhado/formulario/ResumoDoFormulario';
import { useValidacao } from '@/compartilhado/formulario/useValidacao';
import type { VinculoVigenteResponse } from '@/compartilhado/participacoes/useVinculosVigentes';
import { Botao } from '@/design-system/primitivos/Botao';

import type { ProprietarioResponse } from '../api/useProprietarios';

import { ContratoDaSaida } from './ContratoDaSaida';
import estilos from './PainelDeDesativacao.module.css';
import { contratosSemQuemSai, type ContratoSemQuemSai } from './rebalanceamento';
import {
  campoDaSaidaNoServidor,
  rotulosDaSaida,
  validarSaida,
  valoresDaSaida,
  type CampoDaSaida,
} from './validacaoDaSaida';

interface FormularioDeSaidaProps {
  quemSai: ProprietarioResponse;
  /** Já carregados: é deles que sai o modo do painel, e um modo errado leva a um 409. */
  vinculos: VinculoVigenteResponse[];
  proprietarios: ProprietarioResponse[];
  falha: unknown;
  enviando: boolean;
  aoConfirmar: (contratos: ContratoSemQuemSai[]) => void;
  aoCancelar: () => void;
}

/**
 * A redistribuição de quem sai, aeronave por aeronave, e os botões. Sem participação vigente, não
 * há contrato a montar: confirmar só desativa.
 */
export function FormularioDeSaida({
  quemSai,
  vinculos,
  proprietarios,
  falha,
  enviando,
  aoConfirmar,
  aoCancelar,
}: FormularioDeSaidaProps) {
  const id = quemSai.id ?? 0;
  const [contratos, setContratos] = useState(() => contratosSemQuemSai(vinculos, id));
  const idDoResumo = useId();
  const nomes = new Map(proprietarios.map((dono) => [dono.id ?? 0, dono.nome ?? '']));

  const validacao = useValidacao<CampoDaSaida>({
    erros: validarSaida(contratos),
    valores: valoresDaSaida(contratos),
    rotulos: rotulosDaSaida(contratos, nomes),
    falha,
    campoDoServidor: (nome) => campoDaSaidaNoServidor(nome, contratos),
  });

  function candidatosDe(contrato: ContratoSemQuemSai) {
    return proprietarios
      .filter(
        (dono) =>
          dono.situacao === 'ATIVO' &&
          dono.id !== id &&
          !contrato.participacoes.some((participacao) => participacao.proprietarioId === dono.id),
      )
      .map((dono) => ({ id: dono.id ?? 0, nome: dono.nome ?? '' }));
  }

  function mudar(indice: number, contrato: ContratoSemQuemSai) {
    setContratos((atuais) =>
      atuais.map((atual, posicao) => (posicao === indice ? contrato : atual)),
    );
  }

  return (
    <div ref={validacao.refDoFormulario} className={estilos.formulario}>
      {contratos.map((contrato, indice) => (
        <ContratoDaSaida
          key={contrato.aeronaveId}
          contrato={contrato}
          indice={indice}
          quemSai={quemSai.nome ?? ''}
          nomes={nomes}
          candidatos={candidatosDe(contrato)}
          erroDe={validacao.erroDe}
          aoMudar={(novo) => mudar(indice, novo)}
        />
      ))}

      <ResumoDoFormulario id={idDoResumo} resumo={validacao.resumo} />

      <div className={estilos.acoes}>
        <Botao variante="secundario" desabilitado={enviando} aoClicar={aoCancelar}>
          Cancelar
        </Botao>
        <Botao
          carregando={enviando}
          descritoPor={idDoResumo}
          aoClicar={() => validacao.enviar(() => aoConfirmar(contratos))}
        >
          {contratos.length > 0 ? 'Redistribuir e desativar' : 'Desativar'}
        </Botao>
      </div>
    </div>
  );
}
