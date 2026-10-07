import { lerNumero } from '@/compartilhado/formatacao/numero';
import { numero, obrigatorio, primeiraFalha } from '@/compartilhado/formulario/regras';
import type { Erros } from '@/compartilhado/formulario/useValidacao';

import { KM_MAXIMOS } from './regrasDaAeronave';

/** 1 NM = 1,852 km, por definição — é a constante da milha náutica, não configuração. */
const KM_POR_MILHA_NAUTICA = 1.852;

/** O maior total em milhas cujo equivalente em km ainda cabe no campo de km. */
const MAXIMO_DE_MILHAS = Math.floor((KM_MAXIMOS / KM_POR_MILHA_NAUTICA) * 10) / 10;

export type CampoDoConversor = 'milhas';

export const ROTULOS_DO_CONVERSOR: Record<CampoDoConversor, string> = {
  milhas: 'Milhas náuticas (NM)',
};

export function validarConversorDeMilhas(milhas: string): Erros<CampoDoConversor> {
  return {
    milhas: primeiraFalha(
      milhas,
      obrigatorio('Informe as milhas náuticas.'),
      numero({ minimo: 0, maximo: MAXIMO_DE_MILHAS }),
    ),
  };
}

/** O equivalente em km, com a casa decimal que o campo guarda; `null` enquanto não há número. */
export function kmDasMilhas(milhas: string): number | null {
  const valor = lerNumero(milhas);
  return valor === null || valor < 0 ? null : Math.round(valor * KM_POR_MILHA_NAUTICA * 10) / 10;
}
