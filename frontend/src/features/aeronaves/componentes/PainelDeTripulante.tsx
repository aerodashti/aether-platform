import { useRef, useState } from 'react';

import { hojeLocal } from '@/compartilhado/formatacao/datas';
import { Formulario } from '@/compartilhado/formulario/Formulario';
import { ResumoDoFormulario } from '@/compartilhado/formulario/ResumoDoFormulario';
import { useValidacao } from '@/compartilhado/formulario/useValidacao';
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
import {
  rascunhoDe,
  requestDe,
  type CampoDeValidade,
  type RascunhoDoTripulante,
} from './rascunhoDoTripulante';
import { ROTULO_DA_FUNCAO } from './rotulos';
import {
  PRIMEIRA_VALIDADE,
  ROTULOS_DO_TRIPULANTE as ROTULOS,
  ultimaValidade,
  validarTripulante,
  type CampoDoTripulante,
} from './validacaoDoTripulante';

interface PainelDeTripulanteProps {
  aeronaveId: number;
  /** Sem tripulante é vínculo novo; com ele, edição — situação incluída. */
  tripulante?: TripulanteResponse;
  /** Depois de gravar, com o nome salvo: quem confirma é a seção, porque o painel sai de cena. */
  aoSalvar: (nome: string) => void;
  aoFechar: () => void;
}

const OPCOES_DE_FUNCAO = (Object.keys(ROTULO_DA_FUNCAO) as FuncaoDoTripulante[]).map((valor) => ({
  valor,
  rotulo: ROTULO_DA_FUNCAO[valor],
}));

const OPCOES_DE_SITUACAO = [
  { valor: 'ATIVO', rotulo: 'Ativo' },
  { valor: 'INATIVO', rotulo: 'Inativo' },
];

/** O que o branco significa, ou o que uma data já passada vai causar — ela é aceita, não escondida. */
function apoioDaValidade(data: string, hoje: string, sigla: 'CMA' | 'CHT'): string {
  return data !== '' && data < hoje
    ? `Data já passada: o ${sigla} entra vencido e, com o tripulante ativo, a aeronave fica em Atenção.`
    : 'Deixe em branco se não souber: fica como não informada.';
}

/** Vincular e editar tripulante, no mesmo painel do protótipo. O `key` de quem monta zera o estado. */
export function PainelDeTripulante({
  aeronaveId,
  tripulante,
  aoSalvar,
  aoFechar,
}: PainelDeTripulanteProps) {
  const [rascunho, setRascunho] = useState(() => rascunhoDe(tripulante));
  const refDoCma = useRef<HTMLInputElement>(null);
  const refDoCht = useRef<HTMLInputElement>(null);
  const hoje = hojeLocal();

  const criar = useCriarTripulante(aeronaveId);
  const atualizar = useAtualizarTripulante(aeronaveId);
  const editando = tripulante?.id != null;
  const mutacao = editando ? atualizar : criar;
  const titulo = editando ? 'Editar tripulante' : 'Adicionar tripulante';

  const validacao = useValidacao<CampoDoTripulante>({
    erros: validarTripulante(rascunho, hoje),
    valores: rascunho,
    rotulos: ROTULOS,
    falha: mutacao.error,
  });

  function alterar<C extends CampoDoTripulante>(campo: C, valor: RascunhoDoTripulante[C]) {
    setRascunho((atual) => ({ ...atual, [campo]: valor }));
  }

  /**
   * Relê nos campos de data o que o `value` não conta (`validity.badInput`). Roda ao mudar e ao
   * sair de cada campo — uma data digitada pela metade num campo vazio nem dispara mudança.
   */
  function conferirDatas(): Record<CampoDeValidade, boolean> {
    const datasIncompletas = {
      validadeCma: refDoCma.current?.validity.badInput ?? false,
      validadeCht: refDoCht.current?.validity.badInput ?? false,
    };
    setRascunho((atual) => ({ ...atual, datasIncompletas }));
    return datasIncompletas;
  }

  function alterarValidade(campo: CampoDeValidade, valor: string) {
    alterar(campo, valor);
    conferirDatas();
  }

  function salvar() {
    const cadastro = requestDe(rascunho);
    const concluir = () => aoSalvar(rascunho.nome.trim());
    if (tripulante?.id != null) {
      atualizar.mutate({ id: tripulante.id, cadastro }, { onSuccess: concluir });
    } else {
      criar.mutate(cadastro, { onSuccess: concluir });
    }
  }

  function enviar() {
    // O Enter no meio de uma data não passa pela saída do campo: a marca é relida aqui.
    const datasIncompletas = conferirDatas();
    validacao.enviar(() => {
      if (!Object.values(datasIncompletas).some(Boolean)) {
        salvar();
      }
    });
  }

  return (
    <PainelModal aberto aoFechar={aoFechar} rotulo={titulo} podeFechar={!mutacao.isPending}>
      <Formulario referencia={validacao.refDoFormulario} aoEnviar={enviar}>
        {/* A saída de qualquer campo relê as datas: o campo de data incompleto não avisa sozinho. */}
        <div className={estilos.formulario} onBlur={conferirDatas}>
          <Texto variante="titulo" como="h2">
            {titulo}
          </Texto>

          <CampoDeTexto
            rotulo={ROTULOS.nome}
            obrigatorio
            valor={rascunho.nome}
            aoMudar={(valor) => alterar('nome', valor)}
            erro={validacao.erroDe('nome')}
            // Os dados são de outra pessoa: o preenchimento automático traria os de quem usa.
            autoComplete="off"
          />
          <div className={estilos.duasColunas}>
            <CampoDeTexto
              rotulo={ROTULOS.canac}
              valor={rascunho.canac}
              aoMudar={(valor) => alterar('canac', valor)}
              erro={validacao.erroDe('canac')}
              exemplo="123456"
              apoio="6 dígitos, com ou sem pontos."
              inputMode="numeric"
              autoComplete="off"
            />
            <Selecao
              rotulo={ROTULOS.funcao}
              obrigatorio
              valor={rascunho.funcao}
              opcoes={OPCOES_DE_FUNCAO}
              aoMudar={(valor) => alterar('funcao', valor as FuncaoDoTripulante)}
              erro={validacao.erroDe('funcao')}
            />
          </div>

          <Texto variante="legenda" tom="suave" como="h3">
            Licença e habilitações
          </Texto>
          <div className={estilos.duasColunas}>
            <CampoDeTexto
              ref={refDoCma}
              rotulo={ROTULOS.validadeCma}
              tipo="data"
              valor={rascunho.validadeCma}
              aoMudar={(valor) => alterarValidade('validadeCma', valor)}
              erro={validacao.erroDe('validadeCma')}
              apoio={apoioDaValidade(rascunho.validadeCma, hoje, 'CMA')}
              minimo={PRIMEIRA_VALIDADE}
              maximo={ultimaValidade(hoje)}
            />
            <CampoDeTexto
              ref={refDoCht}
              rotulo={ROTULOS.validadeCht}
              tipo="data"
              valor={rascunho.validadeCht}
              aoMudar={(valor) => alterarValidade('validadeCht', valor)}
              erro={validacao.erroDe('validadeCht')}
              apoio={apoioDaValidade(rascunho.validadeCht, hoje, 'CHT')}
              minimo={PRIMEIRA_VALIDADE}
              maximo={ultimaValidade(hoje)}
            />
          </div>
          <CampoDeTexto
            rotulo={ROTULOS.horasTotais}
            valor={rascunho.horasTotais}
            aoMudar={(valor) => alterar('horasTotais', valor)}
            erro={validacao.erroDe('horasTotais')}
            exemplo="3115,5"
            inputMode="decimal"
          />

          <Texto variante="legenda" tom="suave" como="h3">
            Contato
          </Texto>
          <div className={estilos.duasColunas}>
            <CampoDeTexto
              rotulo={ROTULOS.telefone}
              tipo="telefone"
              valor={rascunho.telefone}
              aoMudar={(valor) => alterar('telefone', valor)}
              erro={validacao.erroDe('telefone')}
              exemplo="+55 11 98888-0000"
              autoComplete="off"
            />
            <CampoDeTexto
              rotulo={ROTULOS.email}
              tipo="email"
              valor={rascunho.email}
              aoMudar={(valor) => alterar('email', valor)}
              erro={validacao.erroDe('email')}
              exemplo="nome@empresa.com.br"
              inputMode="email"
              autoComplete="off"
            />
          </div>

          <GrupoDeOpcoes
            rotulo={ROTULOS.situacao}
            obrigatorio
            valor={rascunho.situacao}
            opcoes={OPCOES_DE_SITUACAO}
            aoEscolher={(valor) => alterar('situacao', valor as SituacaoDoTripulante)}
            erro={validacao.erroDe('situacao')}
            apoio="Inativo deixa de gerar avisos de CMA e CHT na aeronave."
            marcador
            larguraIgual
          />

          <ResumoDoFormulario resumo={validacao.resumo} />
          <div className={estilos.acoes}>
            <Botao variante="secundario" aoClicar={aoFechar} desabilitado={mutacao.isPending}>
              Cancelar
            </Botao>
            <Botao tipo="submit" carregando={mutacao.isPending}>
              {editando ? 'Salvar alterações' : 'Adicionar tripulante'}
            </Botao>
          </div>
        </div>
      </Formulario>
    </PainelModal>
  );
}
