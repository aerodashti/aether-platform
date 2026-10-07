import { useId, useState } from 'react';

import { hojeLocal } from '@/compartilhado/formatacao/datas';
import { Formulario } from '@/compartilhado/formulario/Formulario';
import { ResumoDoFormulario } from '@/compartilhado/formulario/ResumoDoFormulario';
import { useValidacao } from '@/compartilhado/formulario/useValidacao';
import { AreaDeTexto } from '@/design-system/primitivos/AreaDeTexto';
import { Botao } from '@/design-system/primitivos/Botao';
import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';
import { PainelModal } from '@/design-system/primitivos/PainelModal';
import { Selecao } from '@/design-system/primitivos/Selecao';
import { Texto } from '@/design-system/primitivos/Texto';

import { useCorrigirTroca, useRegistrarTroca, type TrocaResponse } from '../api/useTrocas';
import { useListasDaTroca } from '../hooks/useListasDaTroca';

import estilos from './PainelDeTroca.module.css';
import { corpoDaTroca, rascunhoInicial, type RascunhoDaTroca } from './rascunhoDaTroca';
import { dataCompleta, moedaEmTexto } from './rotulos';
import { totalDaTroca } from './totalDaTroca';
import {
  PRIMEIRA_DATA_DA_TROCA,
  ROTULOS_DA_TROCA,
  ultimaDataDaTroca,
  validarTroca,
} from './validacaoDaTroca';

interface PainelDeTrocaProps {
  troca?: TrocaResponse;
  aoFechar: () => void;
}

const SELECIONE = { valor: '', rotulo: 'Selecione…' };

/**
 * Registrar e corrigir troca. Cedeu e Recebeu vêm do contrato vigente da aeronave; as regras estão
 * em `validarTroca`, e aqui só se ligam as peças.
 */
export function PainelDeTroca({ troca, aoFechar }: PainelDeTrocaProps) {
  const editando = troca?.id != null;
  const titulo = editando ? 'Editar troca de KM' : 'Nova troca de KM';
  const idDoResumo = useId();
  const hoje = hojeLocal();
  const concluidaEm = troca?.concluidaEm ?? undefined;
  const [rascunho, setRascunho] = useState(() => rascunhoInicial(troca, hoje));

  const registrar = useRegistrarTroca();
  const corrigir = useCorrigirTroca();
  const mutacao = editando ? corrigir : registrar;
  const listas = useListasDaTroca(troca, rascunho);
  const { efetivo } = listas;
  const erros = validarTroca(efetivo, {
    hoje,
    concluidaEm,
    proprietariosDisponiveis: listas.proprietariosDisponiveis,
    proprietarios: listas.proprietarios,
  });
  const validacao = useValidacao({
    erros,
    valores: efetivo,
    rotulos: ROTULOS_DA_TROCA,
    falha: mutacao.error,
  });
  const total =
    erros.horas || erros.valorPorHora ? null : totalDaTroca(efetivo.horas, efetivo.valorPorHora);

  function alterar(campo: keyof RascunhoDaTroca) {
    return (valor: string) => setRascunho((atual) => ({ ...atual, [campo]: valor }));
  }

  function escolherAeronave(aeronaveId: string) {
    // Os donos de uma aeronave não são os da outra.
    setRascunho((atual) => ({ ...atual, aeronaveId, cedenteId: '', recebedorId: '' }));
  }

  function escolherCedente(cedenteId: string) {
    // Quem passou a ceder não pode continuar como quem recebe.
    setRascunho((atual) => ({
      ...atual,
      cedenteId,
      recebedorId: atual.recebedorId === cedenteId ? '' : atual.recebedorId,
    }));
  }

  function salvar() {
    const corpo = corpoDaTroca(efetivo);
    if (corpo === undefined) {
      return;
    }
    if (troca?.id != null) {
      corrigir.mutate({ id: troca.id, troca: corpo }, { onSuccess: aoFechar });
    } else {
      registrar.mutate(corpo, { onSuccess: aoFechar });
    }
  }

  return (
    <PainelModal aberto aoFechar={aoFechar} rotulo={titulo} podeFechar={!mutacao.isPending}>
      <Formulario referencia={validacao.refDoFormulario} aoEnviar={() => validacao.enviar(salvar)}>
        <Texto variante="titulo" como="h2">
          {titulo}
        </Texto>
        <Texto variante="apoio" tom="suave" como="p">
          Horas que um proprietário cede a outro, a devolver. É controle entre eles: o rateio do
          fechamento não muda — o custo continua com quem voou.
        </Texto>

        {listas.falharam ? (
          <div className={estilos.recado} role="alert">
            <Texto variante="apoio" tom="critico" como="p">
              Não foi possível carregar as aeronaves ou os proprietários do painel.
            </Texto>
            <Botao variante="secundario" tamanho="pequeno" aoClicar={listas.recarregar}>
              Tentar de novo
            </Botao>
          </div>
        ) : null}

        <div className={estilos.campos}>
          <div className={estilos.grade}>
            <Selecao
              rotulo="Aeronave"
              obrigatorio
              valor={efetivo.aeronaveId}
              desabilitado={editando}
              opcoes={[
                listas.carregandoAeronaves ? { valor: '', rotulo: 'Carregando…' } : SELECIONE,
                ...listas.opcoesDeAeronaves,
              ]}
              aoMudar={escolherAeronave}
              apoio={
                editando
                  ? 'A aeronave não muda na correção: para outra aeronave, registre uma troca nova.'
                  : undefined
              }
              erro={validacao.erroDe('aeronaveId')}
            />
            <CampoDeTexto
              rotulo="Data"
              tipo="data"
              obrigatorio
              valor={efetivo.data}
              aoMudar={alterar('data')}
              minimo={PRIMEIRA_DATA_DA_TROCA}
              maximo={ultimaDataDaTroca(hoje, concluidaEm)}
              apoio={concluidaEm ? `Devolvida em ${dataCompleta(concluidaEm)}.` : undefined}
              erro={validacao.erroDe('data')}
            />
            <Selecao
              rotulo="Cedeu"
              obrigatorio
              valor={efetivo.cedenteId}
              opcoes={[SELECIONE, ...listas.opcoesDeCedente]}
              aoMudar={escolherCedente}
              apoio={listas.apoioDosProprietarios}
              erro={validacao.erroDe('cedenteId')}
            />
            <Selecao
              rotulo="Recebeu"
              obrigatorio
              valor={efetivo.recebedorId}
              opcoes={[SELECIONE, ...listas.opcoesDeRecebedor]}
              aoMudar={alterar('recebedorId')}
              erro={validacao.erroDe('recebedorId')}
            />
            <CampoDeTexto
              rotulo="Horas voadas (h)"
              obrigatorio
              valor={efetivo.horas}
              aoMudar={alterar('horas')}
              inputMode="decimal"
              alinhamento="direita"
              exemplo="2,5"
              apoio="Em horas decimais, uma casa: 2,5 = 2h30."
              erro={validacao.erroDe('horas')}
            />
            <CampoDeTexto
              rotulo="KM voados (opcional)"
              valor={efetivo.km}
              aoMudar={alterar('km')}
              inputMode="decimal"
              alinhamento="direita"
              exemplo="1.320"
              erro={validacao.erroDe('km')}
            />
            <CampoDeTexto
              rotulo="R$ por hora (opcional)"
              valor={efetivo.valorPorHora}
              aoMudar={alterar('valorPorHora')}
              inputMode="decimal"
              alinhamento="direita"
              exemplo="14.800,00"
              apoio={
                total === null
                  ? 'Valor combinado para acerto em dinheiro.'
                  : `Total da troca: ${moedaEmTexto(total)}.`
              }
              erro={validacao.erroDe('valorPorHora')}
            />
            <CampoDeTexto
              rotulo="Rel. Voo (opcional)"
              valor={efetivo.relatorioDeVoo}
              aoMudar={alterar('relatorioDeVoo')}
              exemplo="RV-1042"
              erro={validacao.erroDe('relatorioDeVoo')}
            />
          </div>
          <AreaDeTexto
            rotulo="Observação (opcional)"
            valor={efetivo.observacao}
            aoMudar={alterar('observacao')}
            maxLength={300}
            exemplo="Quem utilizou a aeronave, trecho, motivo da troca e condição de devolução."
            erro={validacao.erroDe('observacao')}
          />
        </div>

        <ResumoDoFormulario resumo={validacao.resumo} id={idDoResumo} />
        <div className={estilos.acoes}>
          <Botao variante="secundario" aoClicar={aoFechar} desabilitado={mutacao.isPending}>
            Cancelar
          </Botao>
          <Botao tipo="submit" carregando={mutacao.isPending} descritoPor={idDoResumo}>
            {editando ? 'Salvar correção' : 'Registrar troca'}
          </Botao>
        </div>
      </Formulario>
    </PainelModal>
  );
}
