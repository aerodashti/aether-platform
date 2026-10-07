import { juntarClasses } from '@/design-system/classes';

import estilos from './EtiquetaDeSituacao.module.css';
import type { SituacaoRegular } from './useAeronaves';

export const ROTULO_DA_SITUACAO: Record<SituacaoRegular, string> = {
  REGULAR: 'Saudável',
  ATENCAO: 'Atenção',
  VENCIDO: 'Vencido',
};

const CLASSE_DA_SITUACAO = {
  REGULAR: 'regular',
  ATENCAO: 'atencao',
  VENCIDO: 'vencido',
} as const;

/**
 * A etiqueta de situação regulatória do protótipo: dot e rótulo sobre o vestígio da mesma cor.
 * Mora em `compartilhado`: a frota, o detalhe e a Visão geral a mostram.
 */
export function EtiquetaDeSituacao({ situacao }: { situacao: SituacaoRegular }) {
  return (
    <span className={juntarClasses(estilos.situacao, estilos[CLASSE_DA_SITUACAO[situacao]])}>
      {/* Dot com a cor da severidade: um dos poucos círculos permitidos. */}
      <span className={estilos.ponto} aria-hidden="true" />
      {ROTULO_DA_SITUACAO[situacao]}
    </span>
  );
}
