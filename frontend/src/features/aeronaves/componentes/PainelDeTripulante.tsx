import { useState } from 'react';

import { ErroDeApi } from '@/api/cliente';
import { Botao } from '@/design-system/primitivos/Botao';
import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';
import { GrupoDeOpcoes } from '@/design-system/primitivos/GrupoDeOpcoes';
import { PainelModal } from '@/design-system/primitivos/PainelModal';
import { Selecao } from '@/design-system/primitivos/Selecao';
import { Texto } from '@/design-system/primitivos/Texto';

import {
  useAtualizarTripulante,
  useCriarTripulante,
  type FuncaoDoTripulante,
  type SituacaoDoTripulante,
  type TripulanteResponse,
} from '../api/useTripulantes';

import estilos from './PainelDeTripulante.module.css';
import { ROTULO_DA_FUNCAO } from './rotulos';

interface PainelDeTripulanteProps {
  aeronaveId: number;
  /** Sem tripulante é vínculo novo; com ele, edição — situação incluída. */
  tripulante?: TripulanteResponse;
  aoFechar: () => void;
}

/** Vincular e editar piloto, no mesmo painel do protótipo. O `key` de quem monta zera o estado. */
export function PainelDeTripulante({ aeronaveId, tripulante, aoFechar }: PainelDeTripulanteProps) {
  const [nome, setNome] = useState(tripulante?.nome ?? '');
  const [canac, setCanac] = useState(tripulante?.canac ?? '');
  const [funcao, setFuncao] = useState<FuncaoDoTripulante>(tripulante?.funcao ?? 'COMANDANTE');
  const [validadeCma, setValidadeCma] = useState(tripulante?.validadeCma ?? '');
  const [validadeCht, setValidadeCht] = useState(tripulante?.validadeCht ?? '');
  const [horasTotais, setHorasTotais] = useState(
    tripulante?.horasTotais === undefined ? '' : String(tripulante.horasTotais),
  );
  const [telefone, setTelefone] = useState(tripulante?.telefone ?? '');
  const [email, setEmail] = useState(tripulante?.email ?? '');
  const [situacao, setSituacao] = useState<SituacaoDoTripulante>(tripulante?.situacao ?? 'ATIVO');

  const criar = useCriarTripulante(aeronaveId);
  const atualizar = useAtualizarTripulante(aeronaveId);
  const editando = tripulante?.id != null;
  const mutacao = editando ? atualizar : criar;

  function salvar() {
    const horas = horasTotais.trim().replace(',', '.');
    const cadastro = {
      nome,
      canac,
      funcao,
      validadeCma: validadeCma || undefined,
      validadeCht: validadeCht || undefined,
      horasTotais: horas === '' ? undefined : Number(horas),
      telefone,
      email,
      situacao,
    };
    if (tripulante?.id != null) {
      atualizar.mutate({ id: tripulante.id, cadastro }, { onSuccess: aoFechar });
    } else {
      criar.mutate(cadastro, { onSuccess: aoFechar });
    }
  }

  const erro = mutacao.error instanceof ErroDeApi ? mutacao.error.message : undefined;

  return (
    <PainelModal
      aberto
      aoFechar={aoFechar}
      rotulo={editando ? 'Editar piloto' : 'Adicionar piloto'}
    >
      <Texto variante="titulo" como="h2">
        {editando ? 'Editar piloto' : 'Adicionar piloto'}
      </Texto>

      <CampoDeTexto
        rotulo="Nome completo"
        valor={nome}
        aoMudar={setNome}
        maxLength={120}
        autoComplete="off"
        erro={erro}
      />
      <div className={estilos.duasColunas}>
        <CampoDeTexto
          rotulo="Código ANAC (CANAC)"
          valor={canac}
          aoMudar={setCanac}
          maxLength={12}
          inputMode="numeric"
          autoComplete="off"
        />
        <Selecao
          rotulo="Função na aeronave"
          valor={funcao}
          opcoes={(Object.keys(ROTULO_DA_FUNCAO) as FuncaoDoTripulante[]).map((valor) => ({
            valor,
            rotulo: ROTULO_DA_FUNCAO[valor],
          }))}
          aoMudar={(valor) => setFuncao(valor as FuncaoDoTripulante)}
        />
      </div>

      <Texto variante="legenda" tom="suave" como="h3">
        Licença e habilitações
      </Texto>
      <div className={estilos.duasColunas}>
        <CampoDeTexto
          rotulo="Validade do CMA"
          tipo="data"
          valor={validadeCma}
          aoMudar={setValidadeCma}
        />
        <CampoDeTexto
          rotulo="Validade da habilitação (CHT)"
          tipo="data"
          valor={validadeCht}
          aoMudar={setValidadeCht}
        />
      </div>
      <CampoDeTexto
        rotulo="Horas totais de voo"
        valor={horasTotais}
        aoMudar={setHorasTotais}
        inputMode="numeric"
      />

      <Texto variante="legenda" tom="suave" como="h3">
        Contato
      </Texto>
      <div className={estilos.duasColunas}>
        <CampoDeTexto rotulo="Telefone" valor={telefone} aoMudar={setTelefone} maxLength={20} />
        <CampoDeTexto
          rotulo="E-mail"
          valor={email}
          aoMudar={setEmail}
          tipo="email"
          maxLength={180}
          inputMode="email"
          autoComplete="off"
        />
      </div>

      <GrupoDeOpcoes
        rotulo="Situação"
        valor={situacao}
        opcoes={[
          { valor: 'ATIVO', rotulo: 'Ativo' },
          { valor: 'INATIVO', rotulo: 'Inativo' },
        ]}
        aoEscolher={(valor) => setSituacao(valor as SituacaoDoTripulante)}
        marcador
        larguraIgual
      />

      <div className={estilos.acoes}>
        <Botao variante="secundario" aoClicar={aoFechar}>
          Cancelar
        </Botao>
        <Botao
          aoClicar={salvar}
          desabilitado={nome.trim().length === 0}
          carregando={mutacao.isPending}
        >
          {editando ? 'Salvar alterações' : 'Adicionar piloto'}
        </Botao>
      </div>
    </PainelModal>
  );
}
