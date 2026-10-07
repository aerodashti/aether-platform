import { obrigatorio, primeiraFalha } from '@/compartilhado/formulario/regras';
import type { Erros } from '@/compartilhado/formulario/useValidacao';
import {
  competenciaEntre,
  mesesEntre,
  type JanelaDeCompetencias,
} from '@/compartilhado/recorte/competencia';
import {
  periodoForaDeOrdem,
  type CampoDoRecorte,
  type RecorteDeCompetencias,
} from '@/compartilhado/recorte/recorteDeCompetencias';

/** Dez anos de uma vez é o teto do servidor: `ChronoUnit.MONTHS.between(de, ate) >= 120`. */
const MESES_NO_PERIODO = 120;

/**
 * O recorte do fechamento, com os limites de `FechamentoService`: a competência e as pontas do
 * período na janela, o período em ordem e com até dez anos. Aqui nada é "sem limite": o fechamento
 * é sempre de um mês ou de um período fechado.
 */
export function validarRecorteDoFechamento(
  recorte: RecorteDeCompetencias,
  janela: JanelaDeCompetencias,
): Erros<CampoDoRecorte> {
  const naJanela = competenciaEntre(janela);
  if (recorte.modo === 'MENSAL') {
    return {
      competencia: primeiraFalha(
        recorte.competencia,
        obrigatorio('Informe a competência.'),
        naJanela,
      ),
    };
  }
  const erros = {
    de: primeiraFalha(recorte.de, obrigatorio('Informe a competência inicial.'), naJanela),
    ate: primeiraFalha(recorte.ate, obrigatorio('Informe a competência final.'), naJanela),
  };
  if (erros.de || erros.ate) {
    return erros;
  }
  const foraDeOrdem = periodoForaDeOrdem(recorte.de, recorte.ate);
  if (foraDeOrdem) {
    return foraDeOrdem;
  }
  if (mesesEntre(recorte.de, recorte.ate) >= MESES_NO_PERIODO) {
    return { ate: 'O período vai até dez anos.' };
  }
  return {};
}
