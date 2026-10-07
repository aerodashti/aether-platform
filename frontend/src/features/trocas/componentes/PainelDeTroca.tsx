import { useState } from 'react';

import { ErroDeApi } from '@/api/cliente';
import { useAeronaves } from '@/compartilhado/aeronaves/useAeronaves';
import { useVinculosVigentes } from '@/compartilhado/participacoes/useVinculosVigentes';
import { useProprietarios } from '@/compartilhado/proprietarios/useProprietarios';
import { AreaDeTexto } from '@/design-system/primitivos/AreaDeTexto';
import { Botao } from '@/design-system/primitivos/Botao';
import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';
import { PainelModal } from '@/design-system/primitivos/PainelModal';
import { Selecao } from '@/design-system/primitivos/Selecao';
import { Texto } from '@/design-system/primitivos/Texto';

import { useCorrigirTroca, useRegistrarTroca, type TrocaResponse } from '../api/useTrocas';

import estilos from './PainelDeTroca.module.css';
import { hoje, lerNumero, moedaEmTexto, numeroParaCampo } from './rotulos';

interface PainelDeTrocaProps {
  troca?: TrocaResponse;
  aoFechar: () => void;
}

function opcional(texto: string): number | undefined {
  return texto.trim() === '' ? undefined : lerNumero(texto);
}

/**
 * Registrar e corrigir troca. Cedeu e Recebeu vêm do contrato vigente da aeronave — quem já saiu
 * do contrato ainda pode trocar pelo servidor, mas é exceção, e aparece aqui só ao corrigir.
 */
export function PainelDeTroca({ troca, aoFechar }: PainelDeTrocaProps) {
  const editando = troca?.id != null;
  const [aeronaveId, setAeronaveId] = useState(
    troca?.aeronaveId != null ? String(troca.aeronaveId) : '',
  );
  const [data, setData] = useState(troca?.data ?? hoje());
  const [cedenteId, setCedenteId] = useState(troca ? String(troca.cedenteId) : '');
  const [recebedorId, setRecebedorId] = useState(troca ? String(troca.recebedorId) : '');
  const [horas, setHoras] = useState(numeroParaCampo(troca?.horas));
  const [km, setKm] = useState(numeroParaCampo(troca?.km));
  const [valorPorHora, setValorPorHora] = useState(numeroParaCampo(troca?.valorPorHora));
  const [relatorioDeVoo, setRelatorioDeVoo] = useState(troca?.relatorioDeVoo ?? '');
  const [observacao, setObservacao] = useState(troca?.observacao ?? '');

  const aeronaves = useAeronaves();
  const vinculos = useVinculosVigentes();
  const proprietarios = useProprietarios();
  const registrar = useRegistrarTroca();
  const corrigir = useCorrigirTroca();
  const mutacao = editando ? corrigir : registrar;

  const nomes = new Map((proprietarios.data ?? []).map((dono) => [dono.id, dono.nome ?? '']));
  const doContrato = (vinculos.data ?? [])
    .filter((vinculo) => String(vinculo.aeronaveId) === aeronaveId)
    .map((vinculo) => ({
      valor: String(vinculo.proprietarioId),
      rotulo: nomes.get(vinculo.proprietarioId) ?? '',
    }));
  for (const [id, nome] of [
    [troca?.cedenteId, troca?.nomeDoCedente],
    [troca?.recebedorId, troca?.nomeDoRecebedor],
  ] as const) {
    if (editando && id != null && !doContrato.some((opcao) => opcao.valor === String(id))) {
      doContrato.push({ valor: String(id), rotulo: nome ?? '' });
    }
  }
  const vazio = {
    valor: '',
    rotulo: aeronaveId === '' ? 'Escolha a aeronave primeiro' : 'Selecione…',
  };

  const horasLidas = lerNumero(horas);
  const total = Number.isFinite(horasLidas) ? horasLidas * lerNumero(valorPorHora) : Number.NaN;
  const diferentes = cedenteId !== '' && recebedorId !== '' && cedenteId !== recebedorId;
  const podeSalvar =
    aeronaveId !== '' && data !== '' && diferentes && Number.isFinite(horasLidas) && horasLidas > 0;

  function salvar() {
    const corpo = {
      aeronaveId: Number(aeronaveId),
      data,
      cedenteId: Number(cedenteId),
      recebedorId: Number(recebedorId),
      horas: horasLidas,
      km: opcional(km),
      valorPorHora: opcional(valorPorHora),
      relatorioDeVoo: relatorioDeVoo || undefined,
      observacao: observacao || undefined,
    };
    if (troca?.id != null) {
      corrigir.mutate({ id: troca.id, troca: corpo }, { onSuccess: aoFechar });
    } else {
      registrar.mutate(corpo, { onSuccess: aoFechar });
    }
  }

  const erro = mutacao.error instanceof ErroDeApi ? mutacao.error.message : undefined;
  const titulo = editando ? 'Editar troca de KM' : 'Nova troca de KM';

  return (
    <PainelModal aberto aoFechar={aoFechar} rotulo={titulo}>
      <Texto variante="titulo" como="h2">
        {titulo}
      </Texto>
      <Texto variante="apoio" tom="suave" como="p">
        Horas que um proprietário cede a outro, a devolver. É controle entre eles: o rateio do
        fechamento não muda — o custo continua com quem voou.
      </Texto>

      <div className={estilos.grade}>
        <Selecao
          rotulo="Aeronave"
          valor={aeronaveId}
          desabilitado={editando}
          opcoes={[
            { valor: '', rotulo: 'Selecione…' },
            ...(aeronaves.data ?? []).map((aeronave) => ({
              valor: String(aeronave.id),
              rotulo: `${aeronave.matricula} — ${aeronave.modelo}`,
            })),
          ]}
          aoMudar={(valor) => {
            setAeronaveId(valor);
            setCedenteId('');
            setRecebedorId('');
          }}
        />
        <CampoDeTexto rotulo="Data" tipo="data" valor={data} aoMudar={setData} />
        <Selecao
          rotulo="Cedeu"
          valor={cedenteId}
          desabilitado={aeronaveId === ''}
          opcoes={[vazio, ...doContrato]}
          aoMudar={setCedenteId}
        />
        <Selecao
          rotulo="Recebeu"
          valor={recebedorId}
          desabilitado={aeronaveId === ''}
          opcoes={[vazio, ...doContrato.filter((opcao) => opcao.valor !== cedenteId)]}
          aoMudar={setRecebedorId}
        />
        <CampoDeTexto
          rotulo="Horas voadas"
          valor={horas}
          aoMudar={setHoras}
          inputMode="decimal"
          alinhamento="direita"
          exemplo="2,5"
        />
        <CampoDeTexto
          rotulo="KM"
          valor={km}
          aoMudar={setKm}
          inputMode="decimal"
          alinhamento="direita"
        />
        <CampoDeTexto
          rotulo="R$ / hora"
          valor={valorPorHora}
          aoMudar={setValorPorHora}
          inputMode="decimal"
          alinhamento="direita"
          apoio={Number.isFinite(total) ? `Total da troca: ${moedaEmTexto(total)}` : 'Opcional.'}
        />
        <CampoDeTexto
          rotulo="Rel. Voo (opcional)"
          valor={relatorioDeVoo}
          aoMudar={setRelatorioDeVoo}
          maxLength={20}
          exemplo="RV-1042"
        />
      </div>
      <AreaDeTexto
        rotulo="Observação"
        valor={observacao}
        aoMudar={setObservacao}
        maxLength={300}
        exemplo="Quem utilizou a aeronave, trecho, motivo da troca e condição de devolução."
      />

      {/* Junto dos botões, não num campo: a recusa do servidor pode ser de qualquer campo. */}
      {erro ? (
        <div role="alert">
          <Texto variante="apoio" tom="critico" como="p">
            {erro}
          </Texto>
        </div>
      ) : null}

      <div className={estilos.acoes}>
        <Botao variante="secundario" aoClicar={aoFechar}>
          Cancelar
        </Botao>
        <Botao aoClicar={salvar} desabilitado={!podeSalvar} carregando={mutacao.isPending}>
          {editando ? 'Salvar correção' : 'Registrar troca'}
        </Botao>
      </div>
    </PainelModal>
  );
}
