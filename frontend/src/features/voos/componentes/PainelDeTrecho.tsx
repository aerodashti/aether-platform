import { useId, useState } from 'react';

import { useAeronaves } from '@/compartilhado/aeronaves/useAeronaves';
import { hojeLocal } from '@/compartilhado/formatacao/datas';
import { ResumoDoFormulario } from '@/compartilhado/formulario/ResumoDoFormulario';
import { useValidacao } from '@/compartilhado/formulario/useValidacao';
import {
  podeReceberAtribuicao,
  useVinculosVigentes,
} from '@/compartilhado/participacoes/useVinculosVigentes';
import { useProprietarios } from '@/compartilhado/proprietarios/useProprietarios';
import { AreaDeTexto } from '@/design-system/primitivos/AreaDeTexto';
import { Botao } from '@/design-system/primitivos/Botao';
import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';
import { PainelModal } from '@/design-system/primitivos/PainelModal';
import { Selecao } from '@/design-system/primitivos/Selecao';
import { Texto } from '@/design-system/primitivos/Texto';

import { useCorrigirTrecho, useRegistrarTrecho, type TrechoResponse } from '../api/useVoos';

import { fusoDoDispositivo, instantesDoTrecho } from './horarios';
import estilos from './PainelDeTrecho.module.css';
import {
  corpoDoTrecho,
  horariosGravados,
  rascunhoInicial,
  ROTULOS_DO_TRECHO as ROTULOS,
  type CampoDoTrecho,
  type RascunhoDoTrecho,
} from './rascunhoDoTrecho';
import {
  apoioDaAtribuicao,
  apoioDaData,
  apoioDoDestino,
  apoioDoDia,
  opcoesDeAtribuicao,
  textoDaDuracao,
} from './textosDoTrecho';
import { estaRealizado, janelaDaData, LIMITES_DO_TRECHO, validarTrecho } from './validacaoDoTrecho';

interface PainelDeTrechoProps {
  /** Sem trecho é lançamento novo; com ele, correção. */
  trecho?: TrechoResponse;
  /** Pré-seleção vinda do filtro da tela, para o lançamento não começar do zero. */
  aeronaveInicial?: string;
  aoFechar: () => void;
}

/**
 * Lançar e corrigir trecho. As regras estão em `validarTrecho`, a política de quando mostrá-las em
 * `useValidacao`; aqui só se ligam as peças. Na correção a aeronave fica travada — corrigir
 * aeronave é excluir e relançar, e o servidor recusa a troca.
 */
export function PainelDeTrecho({ trecho, aeronaveInicial, aoFechar }: PainelDeTrechoProps) {
  const editando = trecho?.id != null;
  const titulo = editando ? 'Corrigir trecho' : 'Registrar trecho';
  const [rascunho, setRascunho] = useState(() => rascunhoInicial(trecho, aeronaveInicial));
  const aeronaves = useAeronaves();
  const proprietarios = useProprietarios();
  const vinculos = useVinculosVigentes();
  const registrar = useRegistrarTrecho();
  const corrigir = useCorrigirTrecho();
  const mutacao = editando ? corrigir : registrar;

  // A aeronave que veio da URL só vale se está na frota: senão o select mostraria "Selecione…"
  // enquanto o estado guardaria outra, e o envio iria para uma aeronave que não existe.
  const aeronaveNaFrota = (aeronaves.data ?? []).some(
    (aeronave) => String(aeronave.id) === rascunho.aeronaveId,
  );
  const valores: RascunhoDoTrecho =
    editando || aeronaveNaFrota ? rascunho : { ...rascunho, aeronaveId: '' };
  const instantes = instantesDoTrecho(valores.data, valores, horariosGravados(trecho));
  const hoje = hojeLocal();
  const realizado = estaRealizado(valores);
  const janela = janelaDaData(realizado, hoje);
  const validacao = useValidacao({
    erros: validarTrecho(
      valores,
      { hoje, agora: Date.now(), dataGravada: trecho?.data },
      instantes,
    ),
    valores,
    rotulos: ROTULOS,
    falha: mutacao.error,
  });
  const idDoResumo = useId();

  const atribuido = trecho?.proprietarioId == null ? '' : String(trecho.proprietarioId);
  const podeReceber = podeReceberAtribuicao(vinculos.data, valores.aeronaveId, atribuido);
  const semContratoVigente =
    valores.aeronaveId !== '' &&
    vinculos.data !== undefined &&
    !vinculos.data.some((vinculo) => String(vinculo.aeronaveId) === valores.aeronaveId);

  function alterar(campo: CampoDoTrecho) {
    return (valor: string) => setRascunho((atual) => ({ ...atual, [campo]: valor }));
  }

  function campo(nome: CampoDoTrecho) {
    return {
      rotulo: ROTULOS[nome],
      valor: valores[nome],
      aoMudar: alterar(nome),
      erro: validacao.erroDe(nome),
    };
  }

  function salvar() {
    const corpo = corpoDoTrecho(valores, instantes);
    if (trecho?.id != null) {
      corrigir.mutate({ id: trecho.id, trecho: corpo }, { onSuccess: aoFechar });
    } else {
      registrar.mutate(corpo, { onSuccess: aoFechar });
    }
  }

  return (
    <PainelModal aberto aoFechar={aoFechar} rotulo={titulo} podeFechar={!mutacao.isPending}>
      <Texto variante="titulo" como="h2">
        {titulo}
      </Texto>
      <Texto variante="apoio" tom="suave" como="p">
        Trechos com o mesmo Rel. Voo formam o voo completo. O trecho entra no % de uso do rateio
        pelo previsto; com os horários realizados, soma 1 pouso, as horas e os km nos contadores da
        aeronave.
      </Texto>

      <div ref={validacao.refDoFormulario} className={estilos.formulario}>
        <div className={estilos.grade}>
          <Selecao
            {...campo('aeronaveId')}
            obrigatorio
            desabilitado={editando}
            apoio={
              editando ? 'Para trocar a aeronave, exclua o trecho e lance de novo.' : undefined
            }
            opcoes={[
              { valor: '', rotulo: 'Selecione…' },
              ...(aeronaves.data ?? []).map((aeronave) => ({
                valor: String(aeronave.id),
                rotulo: `${aeronave.matricula} — ${aeronave.modelo}`,
              })),
            ]}
            // O dono de uma aeronave não é dono da outra.
            aoMudar={(escolhida) =>
              setRascunho((atual) => ({ ...atual, aeronaveId: escolhida, proprietarioId: '' }))
            }
          />
          <CampoDeTexto
            {...campo('relatorioDeVoo')}
            obrigatorio
            exemplo="RV-2026-044"
            maxLength={LIMITES_DO_TRECHO.relatorioDeVoo}
          />
          <CampoDeTexto
            {...campo('numeroDoTrecho')}
            obrigatorio
            inputMode="numeric"
            apoio="Ordem da perna dentro do Rel. Voo."
          />
          <CampoDeTexto
            {...campo('data')}
            tipo="data"
            obrigatorio
            minimo={janela.minimo}
            maximo={janela.maximo}
            apoio={apoioDaData(valores.data, realizado, hoje)}
          />
          <CampoDeTexto
            {...campo('origem')}
            obrigatorio
            exemplo="SBSP"
            maxLength={4}
            apoio="Código ICAO de 4 letras."
          />
          <CampoDeTexto
            {...campo('destino')}
            obrigatorio
            exemplo="SBRJ"
            maxLength={4}
            apoio={apoioDoDestino(valores.origem, valores.destino)}
          />
          <CampoDeTexto
            {...campo('km')}
            obrigatorio
            inputMode="decimal"
            apoio="Uma casa decimal, como 365,5."
          />
        </div>

        <Texto variante="legenda" tom="suave" como="h3">
          Horários previstos
        </Texto>
        <Texto variante="apoio" tom="suave" como="p">
          Horários no fuso deste dispositivo — {fusoDoDispositivo()}.
        </Texto>
        <div className={estilos.grade}>
          <CampoDeTexto {...campo('partidaPrevista')} tipo="hora" />
          <CampoDeTexto
            {...campo('pousoPrevisto')}
            tipo="hora"
            apoio={apoioDoDia('Pouso', instantes.pousoPrevisto, valores.data)}
          />
        </div>

        <Texto variante="legenda" tom="suave" como="h3">
          Horários realizados
        </Texto>
        <Texto variante="apoio" tom="suave" como="p">
          Preencha após o voo, a partida e o pouso juntos. Só com os dois o trecho soma nos
          contadores da aeronave, e a duração passa a valer pelo realizado.
        </Texto>
        <div className={estilos.grade}>
          <CampoDeTexto
            {...campo('partidaRealizada')}
            tipo="hora"
            apoio={apoioDoDia('Partida', instantes.partidaRealizada, valores.data)}
          />
          <CampoDeTexto
            {...campo('pousoRealizado')}
            tipo="hora"
            apoio={apoioDoDia('Pouso', instantes.pousoRealizado, valores.data)}
          />
        </div>
        <div aria-live="polite">
          <Texto variante="corpo" como="p">
            {textoDaDuracao(instantes)}
          </Texto>
        </div>

        <Selecao
          {...campo('proprietarioId')}
          apoio={apoioDaAtribuicao(semContratoVigente)}
          opcoes={opcoesDeAtribuicao(proprietarios.data ?? [], podeReceber, atribuido)}
        />
        <AreaDeTexto {...campo('observacoes')} maxLength={LIMITES_DO_TRECHO.observacoes} />
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
          {editando ? 'Salvar correção' : 'Registrar trecho'}
        </Botao>
      </div>
    </PainelModal>
  );
}
