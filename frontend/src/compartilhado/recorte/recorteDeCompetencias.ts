import type { Erros } from '@/compartilhado/formulario/useValidacao';

import { RecorteInvalido } from './leituraDaFalha';
import type { ModoDoRecorte } from './useRecorteDaUrl';

export type CampoDoRecorte = 'competencia' | 'de' | 'ate';

/** O recorte de um mês ou de um período, como as telas do fundo e do fechamento o guardam na URL. */
export interface RecorteDeCompetencias {
  modo: ModoDoRecorte;
  competencia: string;
  de: string;
  ate: string;
}

/** A recusa do período com a inicial depois da final, no De, como o servidor a escreve. */
export function periodoForaDeOrdem(de: string, ate: string): Erros<CampoDoRecorte> | undefined {
  const invertido = de !== '' && ate !== '' && de > ate;
  return invertido ? { de: 'A competência inicial vem depois da final.' } : undefined;
}

/** O primeiro erro do recorte, como a falha que a grade mostra no lugar da consulta. */
export function falhaDoRecorte(erros: Erros<CampoDoRecorte>): RecorteInvalido | null {
  const primeiro = erros.competencia ?? erros.de ?? erros.ate;
  return primeiro ? new RecorteInvalido(primeiro) : null;
}
