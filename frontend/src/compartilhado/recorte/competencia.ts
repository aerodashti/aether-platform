import { competenciaLocal, somarMesesNaCompetencia } from '@/compartilhado/formatacao/datas';
import type { Regra } from '@/compartilhado/formulario/regras';

/** "AAAA-MM", com mês de 01 a 12 — o que o campo de mês entrega, ou o que se digita onde ele falta. */
const FORMATO_DE_COMPETENCIA = /^\d{4}-(0[1-9]|1[0-2])$/;

export function ehCompetencia(texto: string): boolean {
  return FORMATO_DE_COMPETENCIA.test(texto);
}

/** As competências que um recorte do fundo aceita, nas duas pontas. */
export interface JanelaDeCompetencias {
  primeira: string;
  ultima: string;
}

/**
 * A mesma `JanelaDeCompetencias` do backend: de janeiro de 2000 até doze meses à frente da
 * corrente. Vale para os filtros de aportes, rendimentos e fechamento.
 */
export function janelaDeCompetencias(corrente = competenciaLocal()): JanelaDeCompetencias {
  return { primeira: '2000-01', ultima: somarMesesNaCompetencia(corrente, 12) };
}

/** "2027-10" → "10/2027", como o servidor escreve a recusa. */
function emTexto(competencia: string): string {
  const [ano, mes] = competencia.split('-');
  return `${mes}/${ano}`;
}

/**
 * Competência no formato do campo e, se houver janela, dentro dela. Vazio passa: some com
 * `obrigatorio` quando o recorte não admite "sem limite".
 */
export function competenciaEntre(janela?: JanelaDeCompetencias): Regra {
  return (texto) => {
    if (texto === '') {
      return undefined;
    }
    if (!ehCompetencia(texto)) {
      return 'Use o formato AAAA-MM, como 2026-10.';
    }
    if (janela && (texto < janela.primeira || texto > janela.ultima)) {
      return `Use uma competência de ${emTexto(janela.primeira)} até ${emTexto(janela.ultima)}.`;
    }
    return undefined;
  };
}

/** Quantos meses vão de `de` até `ate`: de 2026-01 a 2026-12 são 11. */
export function mesesEntre(de: string, ate: string): number {
  const [anoDe = 0, mesDe = 0] = de.split('-').map(Number);
  const [anoAte = 0, mesAte = 0] = ate.split('-').map(Number);
  return (anoAte - anoDe) * 12 + (mesAte - mesDe);
}
