import type { Erros } from '@/compartilhado/formulario/useValidacao';
import { competenciaEntre, type JanelaDeCompetencias } from '@/compartilhado/recorte/competencia';
import {
  periodoForaDeOrdem,
  type CampoDoRecorte,
  type RecorteDeCompetencias,
} from '@/compartilhado/recorte/recorteDeCompetencias';

/**
 * O recorte de aportes e rendimentos, com os limites de `RecorteDoFundo` no backend: cada
 * competência na janela e o período em ordem. Vazio é "sem limite" e passa.
 */
export function validarRecorteDoFundo(
  recorte: RecorteDeCompetencias,
  janela: JanelaDeCompetencias,
): Erros<CampoDoRecorte> {
  const competencia = competenciaEntre(janela);
  if (recorte.modo === 'MENSAL') {
    return { competencia: competencia(recorte.competencia) };
  }
  const erros = { de: competencia(recorte.de), ate: competencia(recorte.ate) };
  if (erros.de || erros.ate) {
    return erros;
  }
  return periodoForaDeOrdem(recorte.de, recorte.ate) ?? {};
}
