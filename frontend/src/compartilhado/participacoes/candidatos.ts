import type { ProprietarioResponse } from '@/compartilhado/proprietarios/useProprietarios';

import type { CandidatoAoContrato } from './IncluirProprietario';

/**
 * Quem pode entrar num contrato: os ativos que ainda não estão nele. `deFora` são os ids que não
 * entram — quem já está no contrato e, na saída, quem está saindo.
 */
export function candidatosAoContrato(
  proprietarios: ProprietarioResponse[],
  deFora: Iterable<number>,
): CandidatoAoContrato[] {
  const excluidos = new Set(deFora);
  return proprietarios
    .filter((dono) => dono.situacao === 'ATIVO' && !excluidos.has(dono.id ?? 0))
    .map((dono) => ({ id: dono.id ?? 0, nome: dono.nome ?? '' }));
}
