import { useState } from 'react';

import { ErroDeApi } from '@/api/cliente';
import { Botao } from '@/design-system/primitivos/Botao';
import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';
import { GrupoDeOpcoes } from '@/design-system/primitivos/GrupoDeOpcoes';
import { PainelModal } from '@/design-system/primitivos/PainelModal';
import { Texto } from '@/design-system/primitivos/Texto';

import {
  useAtualizarParametro,
  useCriarParametro,
  type ParametroResponse,
  type TipoDeParametro,
} from '../api/useManutencao';

import estilos from './PainelDeParametro.module.css';

interface PainelDeParametroProps {
  aeronaveId: number;
  parametro?: ParametroResponse;
  aoFechar: () => void;
}

function numero(texto: string): number | undefined {
  const limpo = texto.trim().replace(',', '.');
  return limpo === '' ? undefined : Number(limpo);
}

/** Novo e edição de parâmetro de controle: a régua muda com o tipo — horas, ciclos ou data. */
export function PainelDeParametro({ aeronaveId, parametro, aoFechar }: PainelDeParametroProps) {
  const editando = parametro?.id != null;
  const [nome, setNome] = useState(parametro?.nome ?? '');
  const [tipo, setTipo] = useState<TipoDeParametro>(parametro?.tipo ?? 'HORAS');
  const [limite, setLimite] = useState(
    parametro?.limite === undefined ? '' : String(parametro.limite),
  );
  const [dataLimite, setDataLimite] = useState(parametro?.dataLimite ?? '');
  const [aviso, setAviso] = useState(parametro?.aviso === undefined ? '' : String(parametro.aviso));

  const criar = useCriarParametro();
  const atualizar = useAtualizarParametro();
  const mutacao = editando ? atualizar : criar;

  function salvar() {
    const corpo = {
      aeronaveId,
      nome,
      tipo,
      limite: tipo === 'DATA' ? undefined : numero(limite),
      dataLimite: tipo === 'DATA' ? dataLimite || undefined : undefined,
      aviso: numero(aviso) ?? 0,
    };
    if (parametro?.id != null) {
      atualizar.mutate({ id: parametro.id, parametro: corpo }, { onSuccess: aoFechar });
    } else {
      criar.mutate(corpo, { onSuccess: aoFechar });
    }
  }

  const erro = mutacao.error instanceof ErroDeApi ? mutacao.error.message : undefined;
  const unidade = tipo === 'HORAS' ? 'horas' : tipo === 'CICLOS' ? 'ciclos' : 'dias';
  const podeSalvar =
    nome.trim() !== '' &&
    aviso.trim() !== '' &&
    (tipo === 'DATA' ? dataLimite !== '' : limite.trim() !== '');

  return (
    <PainelModal
      aberto
      aoFechar={aoFechar}
      rotulo={editando ? 'Editar parâmetro de controle' : 'Novo parâmetro de controle'}
    >
      <Texto variante="titulo" como="h2">
        {editando ? 'Editar parâmetro de controle' : 'Novo parâmetro de controle'}
      </Texto>

      <CampoDeTexto
        rotulo="Nome do parâmetro"
        valor={nome}
        aoMudar={setNome}
        exemplo="Inspeção de célula — 4.000 h"
        maxLength={120}
        erro={erro}
      />
      <GrupoDeOpcoes
        rotulo="Régua do parâmetro"
        valor={tipo}
        opcoes={[
          { valor: 'HORAS', rotulo: 'Horas de célula' },
          { valor: 'CICLOS', rotulo: 'Ciclos' },
          { valor: 'DATA', rotulo: 'Data' },
        ]}
        aoEscolher={(escolhido) => setTipo(escolhido as TipoDeParametro)}
        marcador
      />
      {tipo === 'DATA' ? (
        <CampoDeTexto rotulo="Data limite" tipo="data" valor={dataLimite} aoMudar={setDataLimite} />
      ) : (
        <CampoDeTexto
          rotulo={tipo === 'HORAS' ? 'Horas de célula no limite' : 'Ciclos no limite'}
          valor={limite}
          aoMudar={setLimite}
          inputMode="numeric"
        />
      )}
      <CampoDeTexto
        rotulo={`Avisar a quantos ${unidade} do limite`}
        valor={aviso}
        aoMudar={setAviso}
        inputMode="numeric"
        apoio="Dentro dessa faixa o parâmetro vira atenção."
      />

      <div className={estilos.acoes}>
        <Botao variante="secundario" aoClicar={aoFechar}>
          Cancelar
        </Botao>
        <Botao aoClicar={salvar} desabilitado={!podeSalvar} carregando={mutacao.isPending}>
          {editando ? 'Salvar' : 'Criar parâmetro'}
        </Botao>
      </div>
    </PainelModal>
  );
}
