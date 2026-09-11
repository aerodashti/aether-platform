import { useState } from 'react';

import { ErroDeApi } from '@/api/cliente';
import { useAeronaves } from '@/compartilhado/aeronaves/useAeronaves';
import { useProprietarios } from '@/compartilhado/proprietarios/useProprietarios';
import { AreaDeTexto } from '@/design-system/primitivos/AreaDeTexto';
import { Botao } from '@/design-system/primitivos/Botao';
import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';
import { PainelModal } from '@/design-system/primitivos/PainelModal';
import { Selecao } from '@/design-system/primitivos/Selecao';
import { Texto } from '@/design-system/primitivos/Texto';

import { useCorrigirTrecho, useRegistrarTrecho, type TrechoResponse } from '../api/useVoos';

import estilos from './PainelDeTrecho.module.css';
import { ATRIBUICAO_DE_MANUTENCAO } from './rotulos';

interface PainelDeTrechoProps {
  /** Sem trecho é lançamento novo; com ele, correção. */
  trecho?: TrechoResponse;
  /** Pré-seleção vinda do filtro da tela, para o lançamento não começar do zero. */
  aeronaveInicial?: string;
  aoFechar: () => void;
}

/** A duração exibida ao vivo, com a mesma regra do servidor: realizado completo, senão previsto. */
function duracaoAoVivo(depPrev: string, arrPrev: string, depReal: string, arrReal: string): string {
  const real = depReal && arrReal;
  const dep = real ? depReal : depPrev;
  const arr = real ? arrReal : arrPrev;
  if (!dep || !arr) {
    return '—';
  }
  let minutos =
    Number(arr.slice(0, 2)) * 60 +
    Number(arr.slice(3, 5)) -
    (Number(dep.slice(0, 2)) * 60 + Number(dep.slice(3, 5)));
  if (minutos <= 0) {
    minutos += 24 * 60;
  }
  return `${(Math.round(minutos / 6) / 10).toLocaleString('pt-BR')} h`;
}

/**
 * Lançar e corrigir trecho. Trechos com o mesmo Rel. Voo formam o voo completo; cada trecho conta
 * um pouso e alimenta o % de uso do rateio. Na correção a aeronave fica travada — corrigir
 * aeronave é excluir e relançar, e o servidor recusa a troca.
 */
export function PainelDeTrecho({ trecho, aeronaveInicial, aoFechar }: PainelDeTrechoProps) {
  const editando = trecho?.id != null;
  const [aeronaveId, setAeronaveId] = useState(
    trecho?.aeronaveId != null ? String(trecho.aeronaveId) : (aeronaveInicial ?? ''),
  );
  const [relatorioDeVoo, setRelatorioDeVoo] = useState(trecho?.relatorioDeVoo ?? '');
  const [numeroDoTrecho, setNumeroDoTrecho] = useState(String(trecho?.numeroDoTrecho ?? 1));
  const [data, setData] = useState(trecho?.data ?? '');
  const [origem, setOrigem] = useState(trecho?.origem ?? '');
  const [destino, setDestino] = useState(trecho?.destino ?? '');
  const [km, setKm] = useState(trecho?.km === undefined ? '' : String(trecho.km));
  const [depPrev, setDepPrev] = useState(trecho?.partidaPrevista?.slice(0, 5) ?? '');
  const [arrPrev, setArrPrev] = useState(trecho?.pousoPrevisto?.slice(0, 5) ?? '');
  const [depReal, setDepReal] = useState(trecho?.partidaRealizada?.slice(0, 5) ?? '');
  const [arrReal, setArrReal] = useState(trecho?.pousoRealizado?.slice(0, 5) ?? '');
  const [atribuicao, setAtribuicao] = useState(
    trecho?.proprietarioId != null ? String(trecho.proprietarioId) : '',
  );
  const [observacoes, setObservacoes] = useState(trecho?.observacoes ?? '');

  const aeronaves = useAeronaves();
  const proprietarios = useProprietarios();
  const registrar = useRegistrarTrecho();
  const corrigir = useCorrigirTrecho();
  const mutacao = editando ? corrigir : registrar;

  function salvar() {
    const corpo = {
      aeronaveId: Number(aeronaveId),
      relatorioDeVoo,
      numeroDoTrecho: Number(numeroDoTrecho),
      data,
      origem,
      destino,
      km: Number(km.trim().replace(',', '.')),
      partidaPrevista: depPrev || undefined,
      pousoPrevisto: arrPrev || undefined,
      partidaRealizada: depReal || undefined,
      pousoRealizado: arrReal || undefined,
      proprietarioId: atribuicao === '' ? undefined : Number(atribuicao),
      observacoes,
    };
    if (trecho?.id != null) {
      corrigir.mutate({ id: trecho.id, trecho: corpo }, { onSuccess: aoFechar });
    } else {
      registrar.mutate(corpo, { onSuccess: aoFechar });
    }
  }

  const erro = mutacao.error instanceof ErroDeApi ? mutacao.error.message : undefined;
  const podeSalvar =
    aeronaveId !== '' &&
    relatorioDeVoo.trim() !== '' &&
    data !== '' &&
    origem.trim().length === 4 &&
    destino.trim().length === 4 &&
    km.trim() !== '';

  return (
    <PainelModal
      aberto
      aoFechar={aoFechar}
      rotulo={editando ? 'Corrigir trecho' : 'Registrar trecho'}
    >
      <Texto variante="titulo" como="h2">
        {editando ? 'Corrigir trecho' : 'Registrar trecho'}
      </Texto>
      <Texto variante="apoio" tom="suave" como="p">
        Trechos com o mesmo Rel. Voo formam o voo completo — todas as pernas voadas enquanto a
        aeronave esteve com o proprietário. Cada trecho conta 1 pouso e alimenta o % de uso do
        rateio.
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
          aoMudar={setAeronaveId}
        />
        <CampoDeTexto
          rotulo="Rel. Voo"
          valor={relatorioDeVoo}
          aoMudar={setRelatorioDeVoo}
          exemplo="RV-2026-044"
          maxLength={20}
          erro={erro}
        />
        <CampoDeTexto
          rotulo="Trecho"
          valor={numeroDoTrecho}
          aoMudar={setNumeroDoTrecho}
          inputMode="numeric"
        />
        <CampoDeTexto rotulo="Data do trecho" tipo="data" valor={data} aoMudar={setData} />
        <CampoDeTexto
          rotulo="Origem"
          valor={origem}
          aoMudar={setOrigem}
          exemplo="SBSP"
          maxLength={4}
        />
        <CampoDeTexto
          rotulo="Destino"
          valor={destino}
          aoMudar={setDestino}
          exemplo="SBRJ"
          maxLength={4}
        />
        <CampoDeTexto rotulo="KM" valor={km} aoMudar={setKm} inputMode="numeric" />
      </div>

      <Texto variante="legenda" tom="suave" como="h3">
        Horários previstos
      </Texto>
      <div className={estilos.grade}>
        <CampoDeTexto rotulo="Partida prevista" tipo="hora" valor={depPrev} aoMudar={setDepPrev} />
        <CampoDeTexto rotulo="Pouso previsto" tipo="hora" valor={arrPrev} aoMudar={setArrPrev} />
      </div>

      <Texto variante="legenda" tom="suave" como="h3">
        Horários realizados
      </Texto>
      <Texto variante="apoio" tom="suave" como="p">
        Preencha após o voo. Com o par completo, a duração passa a valer pelo realizado.
      </Texto>
      <div className={estilos.grade}>
        <CampoDeTexto rotulo="Partida realizada" tipo="hora" valor={depReal} aoMudar={setDepReal} />
        <CampoDeTexto rotulo="Pouso realizado" tipo="hora" valor={arrReal} aoMudar={setArrReal} />
      </div>
      <Texto variante="corpo" como="p">
        Duração (automática): {duracaoAoVivo(depPrev, arrPrev, depReal, arrReal)}
      </Texto>

      <Selecao
        rotulo="Atribuição (quem usou)"
        valor={atribuicao}
        opcoes={[
          { valor: '', rotulo: ATRIBUICAO_DE_MANUTENCAO },
          ...(proprietarios.data ?? [])
            .filter((dono) => dono.situacao === 'ATIVO')
            .map((dono) => ({ valor: String(dono.id), rotulo: dono.nome ?? '' })),
        ]}
        aoMudar={setAtribuicao}
      />

      <AreaDeTexto
        rotulo="Observações"
        valor={observacoes}
        aoMudar={setObservacoes}
        maxLength={500}
      />

      <div className={estilos.acoes}>
        <Botao variante="secundario" aoClicar={aoFechar}>
          Cancelar
        </Botao>
        <Botao aoClicar={salvar} desabilitado={!podeSalvar} carregando={mutacao.isPending}>
          {editando ? 'Salvar correção' : 'Registrar trecho'}
        </Botao>
      </div>
    </PainelModal>
  );
}
