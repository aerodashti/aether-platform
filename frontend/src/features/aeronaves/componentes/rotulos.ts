import type { DocumentoDaAeronave, SituacaoRegular } from '../api/useAeronaves';

/**
 * Enum → texto de interface. Fica no front porque é redação de tela: amarrar a API a "Saudável"
 * obrigaria a versionar endpoint para trocar uma palavra.
 */
export const ROTULO_DA_SITUACAO: Record<SituacaoRegular, string> = {
  REGULAR: 'Saudável',
  ATENCAO: 'Atenção',
  VENCIDO: 'Vencido',
};

/** Siglas oficiais não se traduzem nem se expandem no rótulo — o glossário manda. */
export const ROTULO_DO_DOCUMENTO: Record<DocumentoDaAeronave, string> = {
  CVA: 'CVA',
  RETA: 'RETA',
};

const DATA = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
});

export function dataCurta(iso: string | undefined): string {
  return iso ? DATA.format(new Date(`${iso}T00:00:00`)) : '—';
}

/**
 * O prazo em palavras.
 *
 * <p>Existe porque o brief proíbe estado sem consequência: "Atenção" sozinho não informa nada, e a
 * forma correta é dizer o quê e quando. Passado e futuro são o mesmo eixo, então um número
 * negativo vira "há", não um sinal na tela.
 */
export function prazoEmPalavras(dias: number | undefined): string {
  if (dias === undefined) {
    return '';
  }
  if (dias === 0) {
    return 'vence hoje';
  }
  if (dias === 1) {
    return 'vence amanhã';
  }
  if (dias === -1) {
    return 'venceu ontem';
  }
  return dias > 0 ? `em ${dias} dias` : `há ${Math.abs(dias)} dias`;
}

/**
 * O resumo da frota, no cabeçalho.
 *
 * <p>Sai em duas partes porque só a segunda é exceção: vermelho é reservado a AOG, vencido e
 * divergência, e pintar "4 aeronaves" de vermelho gastaria a cor mais forte da paleta numa
 * contagem. A parte do impedimento só existe quando há impedimento — "0 impedidas de voar" é
 * ruído, e o brief chama isso de data slop.
 */
export function resumoDaFrota(
  total: number,
  impedidas: number,
): { frota: string; impedimento: string | null } {
  const frota = total === 1 ? '1 aeronave' : `${total} aeronaves`;
  if (impedidas === 0) {
    return { frota, impedimento: null };
  }
  return {
    frota,
    impedimento: impedidas === 1 ? '1 impedida de voar' : `${impedidas} impedidas de voar`,
  };
}
