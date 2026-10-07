import { useId, useState } from 'react';

import { hojeLocal } from '@/compartilhado/formatacao/datas';
import { Formulario } from '@/compartilhado/formulario/Formulario';
import { ResumoDoFormulario } from '@/compartilhado/formulario/ResumoDoFormulario';
import { useValidacao } from '@/compartilhado/formulario/useValidacao';
import { Botao } from '@/design-system/primitivos/Botao';
import { CampoDeTexto } from '@/design-system/primitivos/CampoDeTexto';
import { PainelModal } from '@/design-system/primitivos/PainelModal';
import { Texto } from '@/design-system/primitivos/Texto';

import { useConcluirTroca, type TrocaResponse } from '../api/useTrocas';

import estilos from './PainelDeTroca.module.css';
import { dataCompleta, descricaoDaTroca } from './rotulos';
import { ROTULOS_DA_CONCLUSAO, validarConclusao } from './validacaoDaConclusao';
import { PRIMEIRA_DATA_DA_TROCA } from './validacaoDaTroca';

interface PainelDeConclusaoProps {
  troca: TrocaResponse;
  aoFechar: () => void;
  /** Depois que o servidor registrou a devolução. */
  aoConcluir: () => void;
}

const TITULO = 'Concluir troca de KM';

/**
 * Registra a devolução das horas na data em que ela aconteceu (D9): quem registra dias depois não
 * fica com a data do clique. Padrão hoje, nunca antes da troca nem no futuro.
 */
export function PainelDeConclusao({ troca, aoFechar, aoConcluir }: PainelDeConclusaoProps) {
  const idDoResumo = useId();
  const hoje = hojeLocal();
  const dataDaTroca = troca.data ?? PRIMEIRA_DATA_DA_TROCA;
  const [concluidaEm, setConcluidaEm] = useState(hoje);
  const concluir = useConcluirTroca();
  const rascunho = { concluidaEm };
  const validacao = useValidacao({
    erros: validarConclusao(rascunho, { hoje, dataDaTroca }),
    valores: rascunho,
    rotulos: ROTULOS_DA_CONCLUSAO,
    falha: concluir.error,
  });

  function salvar() {
    if (troca.id != null) {
      concluir.mutate({ id: troca.id, conclusao: rascunho }, { onSuccess: aoConcluir });
    }
  }

  return (
    <PainelModal aberto aoFechar={aoFechar} rotulo={TITULO} podeFechar={!concluir.isPending}>
      <Formulario referencia={validacao.refDoFormulario} aoEnviar={() => validacao.enviar(salvar)}>
        <Texto variante="titulo" como="h2">
          {TITULO}
        </Texto>
        <Texto variante="apoio" tom="suave" como="p">
          Troca de {descricaoDaTroca(troca)}. Registre quando as horas voltaram para quem cedeu.
        </Texto>

        <CampoDeTexto
          rotulo="Data da devolução"
          tipo="data"
          obrigatorio
          valor={concluidaEm}
          aoMudar={setConcluidaEm}
          minimo={dataDaTroca}
          maximo={hoje}
          apoio={`Entre a data da troca (${dataCompleta(dataDaTroca)}) e hoje.`}
          erro={validacao.erroDe('concluidaEm')}
        />

        <ResumoDoFormulario resumo={validacao.resumo} id={idDoResumo} />
        <div className={estilos.acoes}>
          <Botao variante="secundario" aoClicar={aoFechar} desabilitado={concluir.isPending}>
            Cancelar
          </Botao>
          <Botao
            tom="positivo"
            tipo="submit"
            carregando={concluir.isPending}
            descritoPor={idDoResumo}
          >
            Concluir troca
          </Botao>
        </div>
      </Formulario>
    </PainelModal>
  );
}
