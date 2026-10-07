import { lerNumero, numeroParaCampo } from '@/compartilhado/formatacao/numero';

import type {
  FuncaoDoTripulante,
  SituacaoDoTripulante,
  TripulanteRequest,
  TripulanteResponse,
} from '../api/useTripulantes';

export type CampoDeValidade = 'validadeCma' | 'validadeCht';

/** O painel como a pessoa o preenche: texto em cada campo, com os nomes do JSON do request. */
export interface RascunhoDoTripulante {
  nome: string;
  canac: string;
  funcao: FuncaoDoTripulante;
  validadeCma: string;
  validadeCht: string;
  horasTotais: string;
  telefone: string;
  email: string;
  situacao: SituacaoDoTripulante;
  /**
   * Data digitada pela metade: o campo nativo entrega vazio, mas há algo escrito. Sem esta marca,
   * apagar o dia de uma validade gravada mandaria "sem validade" e apagaria o CMA no servidor.
   */
  datasIncompletas: Record<CampoDeValidade, boolean>;
}

export const SEM_DATAS_INCOMPLETAS: Record<CampoDeValidade, boolean> = {
  validadeCma: false,
  validadeCht: false,
};

/** Vínculo novo em branco, ou a edição já no formato de quem digita ("3115,5", não "3115.5"). */
export function rascunhoDe(tripulante?: TripulanteResponse): RascunhoDoTripulante {
  return {
    nome: tripulante?.nome ?? '',
    canac: tripulante?.canac ?? '',
    funcao: tripulante?.funcao ?? 'COMANDANTE',
    validadeCma: tripulante?.validadeCma ?? '',
    validadeCht: tripulante?.validadeCht ?? '',
    horasTotais: numeroParaCampo(tripulante?.horasTotais),
    telefone: tripulante?.telefone ?? '',
    email: tripulante?.email ?? '',
    situacao: tripulante?.situacao ?? 'ATIVO',
    datasIncompletas: SEM_DATAS_INCOMPLETAS,
  };
}

/** Em branco é "não informado": vai ausente, e não como texto vazio que a regra do servidor leria. */
function opcional(texto: string): string | undefined {
  return texto.trim() || undefined;
}

/** O corpo do POST/PUT. Só é chamado com o rascunho já validado, então nenhum número vira `NaN`. */
export function requestDe(rascunho: RascunhoDoTripulante): TripulanteRequest {
  return {
    nome: rascunho.nome.trim(),
    canac: opcional(rascunho.canac),
    funcao: rascunho.funcao,
    validadeCma: opcional(rascunho.validadeCma),
    validadeCht: opcional(rascunho.validadeCht),
    horasTotais: lerNumero(rascunho.horasTotais) ?? undefined,
    telefone: opcional(rascunho.telefone),
    email: opcional(rascunho.email),
    situacao: rascunho.situacao,
  };
}
