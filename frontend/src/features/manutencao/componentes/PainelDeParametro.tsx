import { useId, useState } from 'react';

import { hojeLocal } from '@/compartilhado/formatacao/datas';
import { Formulario } from '@/compartilhado/formulario/Formulario';
import { ResumoDoFormulario } from '@/compartilhado/formulario/ResumoDoFormulario';
import { useValidacao } from '@/compartilhado/formulario/useValidacao';
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

import { PRIMEIRA_DATA, ultimaDataLimite } from './datasDaManutencao';
import estilos from './Painel.module.css';
import {
  corpoDoParametro,
  rascunhoInicial,
  trocarRegua,
  type RascunhoDoParametro,
} from './rascunhoDoParametro';
import { ROTULO_DO_TIPO_DE_PARAMETRO, UNIDADE_DA_REGUA } from './rotulos';
import { apoioDoLimite, type ContadoresDaAeronave } from './situacaoPrevista';
import { ROTULOS_DO_PARAMETRO, validarParametro } from './validacaoDoParametro';

interface PainelDeParametroProps {
  aeronaveId: number;
  /** Os contadores de hoje: o limite é julgado contra eles, e o modal cobre os chips da página. */
  contadores: ContadoresDaAeronave;
  parametro?: ParametroResponse;
  aoFechar: () => void;
}

const REGUAS: TipoDeParametro[] = ['HORAS', 'CICLOS', 'DATA'];

const ROTULO_DO_LIMITE: Record<Exclude<TipoDeParametro, 'DATA'>, string> = {
  HORAS: 'Limite (h de célula)',
  CICLOS: 'Limite (ciclos)',
};

/** Novo e edição de parâmetro de controle: a régua muda com o tipo — horas, ciclos ou data. */
export function PainelDeParametro({
  aeronaveId,
  contadores,
  parametro,
  aoFechar,
}: PainelDeParametroProps) {
  const editando = parametro?.id != null;
  const titulo = editando ? 'Editar parâmetro de controle' : 'Novo parâmetro de controle';
  const idDoResumo = useId();
  const hoje = hojeLocal();
  const [rascunho, setRascunho] = useState(() => rascunhoInicial(parametro));

  const criar = useCriarParametro();
  const atualizar = useAtualizarParametro();
  const mutacao = editando ? atualizar : criar;
  const validacao = useValidacao({
    erros: validarParametro(rascunho, hoje),
    valores: rascunho,
    rotulos: ROTULOS_DO_PARAMETRO,
    falha: mutacao.error,
  });
  const apoioDaRegua = apoioDoLimite(rascunho, contadores, hoje);
  // Só as horas têm décimos: no iOS, o teclado `numeric` nem tem vírgula.
  const teclado = rascunho.tipo === 'HORAS' ? 'decimal' : 'numeric';

  function alterar(campo: Exclude<keyof RascunhoDoParametro, 'tipo'>) {
    return (valor: string) => setRascunho((atual) => ({ ...atual, [campo]: valor }));
  }

  function salvar() {
    const corpo = corpoDoParametro(rascunho, aeronaveId);
    if (corpo === undefined) {
      return;
    }
    if (parametro?.id != null) {
      atualizar.mutate({ id: parametro.id, parametro: corpo }, { onSuccess: aoFechar });
    } else {
      criar.mutate(corpo, { onSuccess: aoFechar });
    }
  }

  return (
    <PainelModal aberto aoFechar={aoFechar} rotulo={titulo} podeFechar={!mutacao.isPending}>
      <Formulario referencia={validacao.refDoFormulario} aoEnviar={() => validacao.enviar(salvar)}>
        <Texto variante="titulo" como="h2">
          {titulo}
        </Texto>

        <div className={estilos.campos}>
          <CampoDeTexto
            rotulo="Nome do parâmetro"
            obrigatorio
            valor={rascunho.nome}
            aoMudar={alterar('nome')}
            exemplo="Inspeção de célula — 4.000 h"
            maxLength={120}
            erro={validacao.erroDe('nome')}
          />
          <GrupoDeOpcoes
            rotulo="Régua do parâmetro"
            obrigatorio
            valor={rascunho.tipo}
            opcoes={REGUAS.map((tipo) => ({
              valor: tipo,
              rotulo: ROTULO_DO_TIPO_DE_PARAMETRO[tipo],
            }))}
            aoEscolher={(tipo) =>
              setRascunho((atual) => trocarRegua(atual, tipo as TipoDeParametro))
            }
            marcador
            apoio="Trocar a régua apaga o limite e a faixa de aviso: a unidade muda."
            erro={validacao.erroDe('tipo')}
          />
          {rascunho.tipo === 'DATA' ? (
            <CampoDeTexto
              rotulo="Data limite"
              tipo="data"
              obrigatorio
              valor={rascunho.dataLimite}
              aoMudar={alterar('dataLimite')}
              minimo={PRIMEIRA_DATA}
              maximo={ultimaDataLimite(hoje)}
              apoio={apoioDaRegua}
              erro={validacao.erroDe('dataLimite')}
            />
          ) : (
            <CampoDeTexto
              rotulo={ROTULO_DO_LIMITE[rascunho.tipo]}
              obrigatorio
              valor={rascunho.limite}
              aoMudar={alterar('limite')}
              inputMode={teclado}
              alinhamento="direita"
              exemplo={rascunho.tipo === 'HORAS' ? '4.000' : '3.000'}
              apoio={apoioDaRegua}
              erro={validacao.erroDe('limite')}
            />
          )}
          <CampoDeTexto
            rotulo={`Faixa de aviso (${UNIDADE_DA_REGUA[rascunho.tipo]} antes do limite)`}
            obrigatorio
            valor={rascunho.aviso}
            aoMudar={alterar('aviso')}
            inputMode={teclado}
            alinhamento="direita"
            exemplo={rascunho.tipo === 'DATA' ? '30' : '100'}
            apoio="Dentro dessa faixa o parâmetro vira atenção."
            erro={validacao.erroDe('aviso')}
          />
        </div>

        <ResumoDoFormulario resumo={validacao.resumo} id={idDoResumo} />
        <div className={estilos.acoes}>
          <Botao variante="secundario" aoClicar={aoFechar} desabilitado={mutacao.isPending}>
            Cancelar
          </Botao>
          <Botao tipo="submit" carregando={mutacao.isPending} descritoPor={idDoResumo}>
            {editando ? 'Salvar' : 'Criar parâmetro'}
          </Botao>
        </div>
      </Formulario>
    </PainelModal>
  );
}
