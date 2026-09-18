import { juntarClasses } from '@/design-system/classes';

import type { SituacaoRegular } from '../api/useAeronaves';

import estilos from './EtiquetaDeSituacao.module.css';
import { ROTULO_DA_SITUACAO } from './rotulos';

const CLASSE_DA_SITUACAO = {
  REGULAR: 'regular',
  ATENCAO: 'atencao',
  VENCIDO: 'vencido',
} as const;

/**
 * A etiqueta de situação regulatória do protótipo: dot e rótulo sobre o vestígio da mesma cor.
 * Fica na feature, não no design-system, porque só a frota e o detalhe a usam.
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
