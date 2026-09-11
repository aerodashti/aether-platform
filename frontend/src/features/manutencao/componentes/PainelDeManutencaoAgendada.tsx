import { useState } from 'react';

import { ErroDeApi } from '@/api/cliente';
import { Botao } from '@/design-system/primitivos/Botao';
import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';
import { PainelModal } from '@/design-system/primitivos/PainelModal';
import { Texto } from '@/design-system/primitivos/Texto';

import {
  useAgendarManutencao,
  useCorrigirManutencao,
  type ManutencaoResponse,
} from '../api/useManutencao';

import estilos from './PainelDeManutencaoAgendada.module.css';

interface PainelDeManutencaoAgendadaProps {
  aeronaveId: number;
  manutencao?: ManutencaoResponse;
  aoFechar: () => void;
}

/**
 * Agendar e corrigir manutenção. O protótipo edita a linha na própria grade; aqui a edição usa o
 * mesmo painel do agendamento — um formulário só, os mesmos campos, sem duplicar validação.
 */
export function PainelDeManutencaoAgendada({
  aeronaveId,
  manutencao,
  aoFechar,
}: PainelDeManutencaoAgendadaProps) {
  const editando = manutencao?.id != null;
  const [data, setData] = useState(manutencao?.data ?? '');
  const [hora, setHora] = useState(manutencao?.hora?.slice(0, 5) ?? '');
  const [responsavel, setResponsavel] = useState(manutencao?.responsavel ?? '');
  const [descricao, setDescricao] = useState(manutencao?.descricao ?? '');
  const [valor, setValor] = useState(
    manutencao?.valor === undefined ? '' : String(manutencao.valor),
  );

  const agendar = useAgendarManutencao();
  const corrigir = useCorrigirManutencao();
  const mutacao = editando ? corrigir : agendar;

  function salvar() {
    const limpo = valor.trim().replace(',', '.');
    const corpo = {
      aeronaveId,
      data,
      hora: hora || undefined,
      responsavel: responsavel || undefined,
      descricao,
      valor: limpo === '' ? undefined : Number(limpo),
    };
    if (manutencao?.id != null) {
      corrigir.mutate({ id: manutencao.id, manutencao: corpo }, { onSuccess: aoFechar });
    } else {
      agendar.mutate(corpo, { onSuccess: aoFechar });
    }
  }

  const erro = mutacao.error instanceof ErroDeApi ? mutacao.error.message : undefined;
  const podeSalvar = data !== '' && descricao.trim() !== '';

  return (
    <PainelModal
      aberto
      aoFechar={aoFechar}
      rotulo={editando ? 'Corrigir manutenção' : 'Nova manutenção programada'}
    >
      <Texto variante="titulo" como="h2">
        {editando ? 'Corrigir manutenção' : 'Nova manutenção programada'}
      </Texto>
      <Texto variante="apoio" tom="suave" como="p">
        Manutenções programadas aparecem no calendário de voos.
      </Texto>

      <div className={estilos.grade}>
        <CampoDeTexto rotulo="Data" tipo="data" valor={data} aoMudar={setData} />
        <CampoDeTexto rotulo="Horário" tipo="hora" valor={hora} aoMudar={setHora} />
      </div>
      <CampoDeTexto
        rotulo="Responsável"
        valor={responsavel}
        aoMudar={setResponsavel}
        exemplo="Hangar Líder — SBSP"
        maxLength={120}
      />
      <CampoDeTexto
        rotulo="Descrição"
        valor={descricao}
        aoMudar={setDescricao}
        exemplo="Inspeção de 100 h — célula"
        maxLength={200}
        erro={erro}
      />
      <CampoDeTexto
        rotulo="Valor (R$)"
        valor={valor}
        aoMudar={setValor}
        inputMode="numeric"
        apoio="Opcional — entra no histórico e, no futuro, nos custos."
      />

      <div className={estilos.acoes}>
        <Botao variante="secundario" aoClicar={aoFechar}>
          Cancelar
        </Botao>
        <Botao aoClicar={salvar} desabilitado={!podeSalvar} carregando={mutacao.isPending}>
          {editando ? 'Salvar' : 'Agendar'}
        </Botao>
      </div>
    </PainelModal>
  );
}
