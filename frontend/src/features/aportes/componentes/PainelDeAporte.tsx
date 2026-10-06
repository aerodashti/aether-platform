import { useState } from 'react';

import { ErroDeApi } from '@/api/cliente';
import { useAeronaves } from '@/compartilhado/aeronaves/useAeronaves';
import { useVinculosVigentes } from '@/compartilhado/participacoes/useVinculosVigentes';
import { useProprietarios } from '@/compartilhado/proprietarios/useProprietarios';
import { Botao } from '@/design-system/primitivos/Botao';
import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';
import { PainelModal } from '@/design-system/primitivos/PainelModal';
import { Selecao } from '@/design-system/primitivos/Selecao';
import { Texto } from '@/design-system/primitivos/Texto';

import { useCorrigirAporte, useRegistrarAporte, type AporteResponse } from '../api/useAportes';

import estilos from './PainelDeAporte.module.css';
import { competenciaAtual, hoje, lerValor, valorParaCampo } from './rotulos';

interface PainelDeAporteProps {
  aporte?: AporteResponse;
  aeronaveInicial?: string;
  aoFechar: () => void;
}

/**
 * Registrar e corrigir aporte. A lista de proprietários é a do contrato vigente da aeronave
 * escolhida — quem saiu do contrato ainda pode aportar pelo servidor, mas é exceção, e aparece
 * aqui só ao corrigir um aporte dele.
 */
export function PainelDeAporte({ aporte, aeronaveInicial, aoFechar }: PainelDeAporteProps) {
  const editando = aporte?.id != null;
  const [aeronaveId, setAeronaveId] = useState(
    aporte?.aeronaveId != null ? String(aporte.aeronaveId) : (aeronaveInicial ?? ''),
  );
  const [proprietarioId, setProprietarioId] = useState(
    aporte?.proprietarioId != null ? String(aporte.proprietarioId) : '',
  );
  const [data, setData] = useState(aporte?.data ?? hoje());
  const [competencia, setCompetencia] = useState(aporte?.competencia ?? competenciaAtual());
  const [valor, setValor] = useState(valorParaCampo(aporte?.valor));

  const aeronaves = useAeronaves();
  const vinculos = useVinculosVigentes();
  const proprietarios = useProprietarios();
  const registrar = useRegistrarAporte();
  const corrigir = useCorrigirAporte();
  const mutacao = editando ? corrigir : registrar;

  const nomes = new Map((proprietarios.data ?? []).map((dono) => [dono.id, dono.nome ?? '']));
  const doContrato = (vinculos.data ?? [])
    .filter((vinculo) => String(vinculo.aeronaveId) === aeronaveId)
    .map((vinculo) => ({
      valor: String(vinculo.proprietarioId),
      rotulo: nomes.get(vinculo.proprietarioId) ?? '',
    }));
  // Corrigindo o aporte de quem já saiu do contrato, ele continua escolhível.
  if (editando && proprietarioId && !doContrato.some((opcao) => opcao.valor === proprietarioId)) {
    doContrato.push({ valor: proprietarioId, rotulo: aporte?.nomeDoProprietario ?? '' });
  }

  function salvar() {
    const corpo = {
      aeronaveId: Number(aeronaveId),
      proprietarioId: Number(proprietarioId),
      data,
      competencia,
      valor: lerValor(valor),
    };
    if (aporte?.id != null) {
      corrigir.mutate({ id: aporte.id, aporte: corpo }, { onSuccess: aoFechar });
    } else {
      registrar.mutate(corpo, { onSuccess: aoFechar });
    }
  }

  const erro = mutacao.error instanceof ErroDeApi ? mutacao.error.message : undefined;
  const valorLido = lerValor(valor);
  const podeSalvar =
    aeronaveId !== '' &&
    proprietarioId !== '' &&
    data !== '' &&
    competencia !== '' &&
    Number.isFinite(valorLido) &&
    valorLido > 0;
  const titulo = editando ? 'Corrigir aporte' : 'Registrar aporte';

  return (
    <PainelModal aberto aoFechar={aoFechar} rotulo={titulo}>
      <Texto variante="titulo" como="h2">
        {titulo}
      </Texto>
      <Texto variante="apoio" tom="suave" como="p">
        Um aporte de proprietário no fundo da aeronave. Ele entra no total aportado da competência.
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
          aoMudar={(valorEscolhido) => {
            setAeronaveId(valorEscolhido);
            setProprietarioId('');
          }}
        />
        <Selecao
          rotulo="Proprietário"
          valor={proprietarioId}
          desabilitado={aeronaveId === ''}
          opcoes={[
            {
              valor: '',
              rotulo:
                aeronaveId === ''
                  ? 'Escolha a aeronave primeiro'
                  : doContrato.length === 0
                    ? 'Nenhum proprietário no contrato'
                    : 'Selecione…',
            },
            ...doContrato,
          ]}
          aoMudar={setProprietarioId}
        />
        <CampoDeTexto rotulo="Data do crédito" tipo="data" valor={data} aoMudar={setData} />
        <CampoDeTexto
          rotulo="Competência"
          tipo="mes"
          valor={competencia}
          aoMudar={setCompetencia}
          apoio="O mês a que o aporte se refere."
        />
        <CampoDeTexto
          rotulo="Valor (R$)"
          valor={valor}
          aoMudar={setValor}
          inputMode="decimal"
          alinhamento="direita"
          exemplo="25.000,00"
        />
      </div>

      <Texto variante="apoio" tom="suave" como="p">
        O aporte é registrado como <strong>recebido</strong> — registre apenas depois que a
        transferência cair na conta.
      </Texto>

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
          {editando ? 'Salvar correção' : 'Registrar aporte'}
        </Botao>
      </div>
    </PainelModal>
  );
}
