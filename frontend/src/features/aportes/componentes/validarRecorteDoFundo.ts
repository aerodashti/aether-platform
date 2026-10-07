import type { Erros } from '@/compartilhado/formulario/useValidacao';
import { competenciaEntre, type JanelaDeCompetencias } from '@/compartilhado/recorte/competencia';
import type { ModoDoRecorte } from '@/compartilhado/recorte/useRecorteDaUrl';

export type CampoDoRecorte = 'competencia' | 'de' | 'ate';

export interface RecorteDoFundo {
  modo: ModoDoRecorte;
  competencia: string;
  de: string;
  ate: string;
}

/**
 * O recorte de aportes e rendimentos, com os limites de `RecorteDoFundo` no backend: cada
 * competência na janela e o período em ordem. Vazio é "sem limite" e passa.
 */
export function validarRecorteDoFundo(
  recorte: RecorteDoFundo,
  janela: JanelaDeCompetencias,
): Erros<CampoDoRecorte> {
  const competencia = competenciaEntre(janela);
  if (recorte.modo === 'MENSAL') {
    return { competencia: competencia(recorte.competencia) };
  }
  const erros = { de: competencia(recorte.de), ate: competencia(recorte.ate) };
  const invertido = recorte.de !== '' && recorte.ate !== '' && recorte.de > recorte.ate;
  if (!erros.de && !erros.ate && invertido) {
    return { de: 'A competência inicial vem depois da final.' };
  }
  return erros;
}
