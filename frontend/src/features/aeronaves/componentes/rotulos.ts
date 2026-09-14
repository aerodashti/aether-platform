import type { DocumentoDaAeronave, SituacaoRegular } from '../api/useAeronaves';
import type { BaseDoRateio, ModeloDeAporte } from '../api/useDetalheDaAeronave';
import type { FuncaoDoTripulante } from '../api/useTripulantes';

export { percentualEmTexto } from '@/compartilhado/formatacao/percentual';

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

/* ------------------------------------------------------------------------------------------------
 * Detalhe da aeronave
 * ---------------------------------------------------------------------------------------------- */

export const ROTULO_DA_BASE_DO_RATEIO: Record<BaseDoRateio, string> = {
  POR_USO: 'Por uso (horas / km)',
  POR_PROPRIEDADE: 'Por % de propriedade',
};

export const ROTULO_DO_MODELO_DE_APORTE: Record<ModeloDeAporte, string> = {
  FIXO: 'Aporte fixo',
  PROPORCIONAL_AO_USO: 'Proporcional ao uso',
};

export const ROTULO_DA_FUNCAO: Record<FuncaoDoTripulante, string> = {
  COMANDANTE: 'Comandante',
  COPILOTO: 'Copiloto',
  INSTRUTOR: 'Instrutor',
  EXAMINADOR: 'Examinador',
};

/** As periodicidades do produto, na redação da tela. */
export const PERIODICIDADES: Array<{ valor: number; rotulo: string }> = [
  { valor: 1, rotulo: 'Todo mês (mensal)' },
  { valor: 2, rotulo: 'A cada 2 meses (bimestral)' },
  { valor: 3, rotulo: 'A cada 3 meses (trimestral)' },
  { valor: 4, rotulo: 'A cada 4 meses (quadrimestral)' },
  { valor: 6, rotulo: 'A cada 6 meses (semestral)' },
  { valor: 12, rotulo: 'A cada 12 meses (anual)' },
];

const NUMERO = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const INTEIRO = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const MOEDA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Ausente é travessão. Zero é zero — são afirmações diferentes. */
export function horasEmTexto(valor: number | undefined): string {
  return valor === undefined ? '—' : `${NUMERO.format(valor)} h`;
}

export function inteiroEmTexto(valor: number | undefined): string {
  return valor === undefined ? '—' : INTEIRO.format(valor);
}

export function moedaEmTexto(valor: number | undefined): string {
  return valor === undefined ? '—' : MOEDA.format(valor);
}

const MES_ANO = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' });
const DATA_COMPLETA = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' });

/** "jan. de 2024 – atual" para o vigente; as duas pontas para o arquivado. */
export function periodoDoContrato(inicio: string | undefined, fim: string | undefined): string {
  const de = inicio ? MES_ANO.format(new Date(inicio)) : '—';
  return fim ? `${de} – ${MES_ANO.format(new Date(fim))}` : `${de} – atual`;
}

export function dataCompleta(iso: string | undefined): string {
  return iso ? DATA_COMPLETA.format(new Date(iso)) : '—';
}

/**
 * Percentual digitado → número, aceitando vírgula. Devolve NaN para o que não é número — quem
 * consome decide o que fazer com a linha inválida.
 */
export function lerPercentual(texto: string): number {
  const limpo = texto.trim().replace(',', '.');
  return limpo === '' ? NaN : Number(limpo);
}

/**
 * Divide 100% igualmente com duas casas, jogando o resto no primeiro: 3 sócios viram
 * 33,34 + 33,33 + 33,33 — a soma fecha por construção.
 */
export function dividirIgualmente(quantidade: number): number[] {
  if (quantidade <= 0) {
    return [];
  }
  const base = Math.floor(10000 / quantidade) / 100;
  const primeiro = Math.round((100 - base * (quantidade - 1)) * 100) / 100;
  return [primeiro, ...Array.from({ length: quantidade - 1 }, () => base)];
}
