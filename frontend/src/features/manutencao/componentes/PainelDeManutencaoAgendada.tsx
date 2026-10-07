import { useId, useRef, useState } from 'react';

import { hojeLocal } from '@/compartilhado/formatacao/datas';
import { ResumoDoFormulario } from '@/compartilhado/formulario/ResumoDoFormulario';
import { useValidacao } from '@/compartilhado/formulario/useValidacao';
import { Botao } from '@/design-system/primitivos/Botao';
import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';
import { PainelModal } from '@/design-system/primitivos/PainelModal';
import { Texto } from '@/design-system/primitivos/Texto';

import {
  useAgendarManutencao,
  useCorrigirManutencao,
  type ManutencaoResponse,
} from '../api/useManutencao';

import { primeiraDataProgramavel, ultimaDataProgramavel } from './datasDaManutencao';
import estilos from './Painel.module.css';
import {
  corpoDaManutencao,
  rascunhoInicial,
  type RascunhoDaManutencao,
} from './rascunhoDaManutencao';
import { ROTULOS_DA_MANUTENCAO, validarManutencao } from './validacaoDaManutencao';

interface PainelDeManutencaoAgendadaProps {
  aeronaveId: number;
  manutencao?: ManutencaoResponse;
  aoFechar: () => void;
}

/** A data passada é aceita (registro tardio), mas a pessoa precisa saber o que ela causa (D2). */
function apoioDaData(data: string, hoje: string): string | undefined {
  return /^\d{4}-\d{2}-\d{2}$/.test(data) && data < hoje
    ? 'Data passada: a manutenção nasce atrasada e a aeronave fica impedida de voar até ela ser concluída.'
    : undefined;
}

/**
 * Agendar e corrigir manutenção. O protótipo edita a linha na própria grade; aqui a edição usa o
 * mesmo painel do agendamento — um formulário só, os mesmos campos. As regras estão em
 * `validarManutencao`, e aqui só se ligam as peças.
 */
export function PainelDeManutencaoAgendada({
  aeronaveId,
  manutencao,
  aoFechar,
}: PainelDeManutencaoAgendadaProps) {
  const editando = manutencao?.id != null;
  const titulo = editando ? 'Corrigir manutenção' : 'Nova manutenção programada';
  const idDoResumo = useId();
  const hoje = hojeLocal();
  const refDaHora = useRef<HTMLInputElement>(null);
  const [rascunho, setRascunho] = useState(() => rascunhoInicial(manutencao));
  const [horaIncompleta, setHoraIncompleta] = useState(false);

  const agendar = useAgendarManutencao();
  const corrigir = useCorrigirManutencao();
  const mutacao = editando ? corrigir : agendar;
  const validacao = useValidacao({
    erros: validarManutencao(rascunho, { hoje, dataGravada: manutencao?.data, horaIncompleta }),
    valores: rascunho,
    rotulos: ROTULOS_DA_MANUTENCAO,
    falha: mutacao.error,
  });

  function alterar(campo: keyof RascunhoDaManutencao) {
    return (valor: string) => setRascunho((atual) => ({ ...atual, [campo]: valor }));
  }

  /**
   * O horário digitado pela metade chega vazio, e salvar assim apagaria a hora gravada. Só o campo
   * sabe (`validity.badInput`): relido ao mudar, ao sair dos campos e ao salvar.
   */
  function conferirHora(): boolean {
    const incompleta = refDaHora.current?.validity.badInput ?? false;
    setHoraIncompleta(incompleta);
    return incompleta;
  }

  function alterarHora(hora: string) {
    alterar('hora')(hora);
    conferirHora();
  }

  function salvar() {
    const corpo = corpoDaManutencao(rascunho, aeronaveId);
    if (corpo === undefined || conferirHora()) {
      return;
    }
    if (manutencao?.id != null) {
      corrigir.mutate({ id: manutencao.id, manutencao: corpo }, { onSuccess: aoFechar });
    } else {
      agendar.mutate(corpo, { onSuccess: aoFechar });
    }
  }

  return (
    <PainelModal aberto aoFechar={aoFechar} rotulo={titulo} podeFechar={!mutacao.isPending}>
      <Texto variante="titulo" como="h2">
        {titulo}
      </Texto>
      <Texto variante="apoio" tom="suave" como="p">
        Manutenções programadas aparecem no calendário de voos.
      </Texto>

      <div ref={validacao.refDoFormulario} className={estilos.campos} onBlur={conferirHora}>
        <div className={estilos.grade}>
          <CampoDeTexto
            rotulo="Data"
            tipo="data"
            obrigatorio
            valor={rascunho.data}
            aoMudar={alterar('data')}
            minimo={primeiraDataProgramavel(hoje)}
            maximo={ultimaDataProgramavel(hoje)}
            apoio={apoioDaData(rascunho.data, hoje)}
            erro={validacao.erroDe('data')}
          />
          <CampoDeTexto
            ref={refDaHora}
            rotulo="Horário"
            tipo="hora"
            valor={rascunho.hora}
            aoMudar={alterarHora}
            apoio="Opcional."
            erro={validacao.erroDe('hora')}
          />
        </div>
        <CampoDeTexto
          rotulo="Responsável"
          valor={rascunho.responsavel}
          aoMudar={alterar('responsavel')}
          exemplo="Hangar Líder — SBSP"
          maxLength={120}
          apoio="Opcional — a oficina ou o hangar."
          erro={validacao.erroDe('responsavel')}
        />
        <CampoDeTexto
          rotulo="Descrição"
          obrigatorio
          valor={rascunho.descricao}
          aoMudar={alterar('descricao')}
          exemplo="Inspeção de 100 h — célula"
          maxLength={200}
          erro={validacao.erroDe('descricao')}
        />
        <CampoDeTexto
          rotulo="Valor (R$)"
          valor={rascunho.valor}
          aoMudar={alterar('valor')}
          inputMode="decimal"
          alinhamento="direita"
          exemplo="48.000,00"
          apoio="Opcional — entra no histórico e, no futuro, nos custos."
          erro={validacao.erroDe('valor')}
        />
      </div>

      <ResumoDoFormulario resumo={validacao.resumo} id={idDoResumo} />
      <div className={estilos.acoes}>
        <Botao variante="secundario" aoClicar={aoFechar} desabilitado={mutacao.isPending}>
          Cancelar
        </Botao>
        <Botao
          aoClicar={() => validacao.enviar(salvar)}
          carregando={mutacao.isPending}
          descritoPor={idDoResumo}
        >
          {editando ? 'Salvar' : 'Agendar'}
        </Botao>
      </div>
    </PainelModal>
  );
}
