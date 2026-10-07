import { useId } from 'react';

import { ResumoDoFormulario } from '@/compartilhado/formulario/ResumoDoFormulario';
import { Botao } from '@/design-system/primitivos/Botao';
import { PainelModal } from '@/design-system/primitivos/PainelModal';
import { Texto } from '@/design-system/primitivos/Texto';

import { useReabrirTroca, type TrocaResponse } from '../api/useTrocas';

import estilos from './PainelDeTroca.module.css';
import { dataCompleta, descricaoDaTroca } from './rotulos';

interface PainelDeReaberturaProps {
  troca: TrocaResponse;
  aoFechar: () => void;
  /** Depois que o servidor devolveu a troca às pendentes. */
  aoReabrir: () => void;
}

const TITULO = 'Reabrir troca de KM';

/**
 * Reabrir descarta a data da devolução, e ela não volta (D8): por isso pede confirmação, dizendo
 * qual troca e qual data se perdem. Para corrigir a data, reabre-se e conclui-se de novo.
 */
export function PainelDeReabertura({ troca, aoFechar, aoReabrir }: PainelDeReaberturaProps) {
  const idDoResumo = useId();
  const reabrir = useReabrirTroca();

  function confirmar() {
    if (troca.id != null) {
      reabrir.mutate(troca.id, { onSuccess: aoReabrir });
    }
  }

  return (
    <PainelModal aberto aoFechar={aoFechar} rotulo={TITULO} podeFechar={!reabrir.isPending}>
      <Texto variante="titulo" como="h2">
        {TITULO}
      </Texto>
      <Texto variante="corpo" como="p">
        A troca de {descricaoDaTroca(troca)}, volta para as pendentes.
      </Texto>
      {troca.concluidaEm ? (
        <Texto variante="apoio" tom="atencao" como="p">
          A devolução registrada em {dataCompleta(troca.concluidaEm)} será descartada: ao concluir
          de novo, informe a data outra vez.
        </Texto>
      ) : null}

      <ResumoDoFormulario resumo={reabrir.error?.message} id={idDoResumo} />
      <div className={estilos.acoes}>
        <Botao variante="secundario" aoClicar={aoFechar} desabilitado={reabrir.isPending}>
          Cancelar
        </Botao>
        <Botao aoClicar={confirmar} carregando={reabrir.isPending} descritoPor={idDoResumo}>
          Reabrir troca
        </Botao>
      </div>
    </PainelModal>
  );
}
