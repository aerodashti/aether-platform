import { numero, obrigatorio, primeiraFalha } from '@/compartilhado/formulario/regras';
import type { Erros } from '@/compartilhado/formulario/useValidacao';

export type CampoDoAviso = 'diasDeAviso';

export type RascunhoDoAviso = Record<CampoDoAviso, string>;

export const ROTULOS_DO_AVISO: Record<CampoDoAviso, string> = {
  diasDeAviso: 'Personalizado (dias)',
};

/** A faixa de `Empresa.aceitaAviso` e do CHECK da coluna: avisar com 400 dias não é aviso. */
export const MINIMO_DE_DIAS = 1;
export const MAXIMO_DE_DIAS = 365;

export function validarAviso(rascunho: RascunhoDoAviso): Erros<CampoDoAviso> {
  return {
    diasDeAviso: primeiraFalha(
      rascunho.diasDeAviso,
      obrigatorio('Informe a antecedência, em dias.'),
      numero({ minimo: MINIMO_DE_DIAS, maximo: MAXIMO_DE_DIAS, casas: 0 }),
    ),
  };
}
