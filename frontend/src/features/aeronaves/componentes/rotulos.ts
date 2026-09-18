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
export function prazoEmPalavras(dias: number | null | undefined): string {
  if (dias == null) {
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
export function horasEmTexto(valor: number | null | undefined): string {
  return valor == null ? '—' : `${NUMERO.format(valor)} h`;
}

export function inteiroEmTexto(valor: number | null | undefined): string {
  return valor == null ? '—' : INTEIRO.format(valor);
}

export function moedaEmTexto(valor: number | null | undefined): string {
  return valor == null ? '—' : MOEDA.format(valor);
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

/** "RETA vence em 12 dias" / "RETA vence hoje" / "RETA venceu há 3 dias" — a consequência da situação. */
export function consequenciaDoVencimento(
  documento: DocumentoDaAeronave,
  dias: number | null | undefined,
): string {
  const sigla = ROTULO_DO_DOCUMENTO[documento];
  if (dias == null) {
    return `${sigla} vence primeiro`;
  }
  const prazo = prazoEmPalavras(dias);
  // As bordas já vêm com o verbo ("vence hoje", "venceu ontem"); o resto precisa dele.
  if (prazo.startsWith('vence')) {
    return `${sigla} ${prazo}`;
  }
  return dias > 0 ? `${sigla} vence ${prazo}` : `${sigla} venceu ${prazo}`;
}

export type TomDaSoma = 'positivo' | 'atencao' | 'critico';

/** As mensagens de soma do protótipo, na mesma redação; o tom decide a cor e se dá para salvar. */
export function mensagemDaSoma(
  percentuais: number[],
  houveMudanca: boolean,
): { tom: TomDaSoma; texto: string } {
  if (percentuais.some((percentual) => percentual < 0)) {
    return { tom: 'critico', texto: 'Há participação negativa — corrija para continuar.' };
  }
  if (percentuais.length === 0 || percentuais.some((p) => Number.isNaN(p) || p === 0)) {
    return { tom: 'atencao', texto: 'Todo proprietário precisa de participação maior que 0%.' };
  }
  const soma = percentuais.reduce((total, percentual) => total + percentual, 0);
  if (Math.abs(soma - 100) >= 0.005) {
    return { tom: 'atencao', texto: 'Ajuste os percentuais para somar 100%.' };
  }
  if (!houveMudanca) {
    return { tom: 'atencao', texto: 'Nenhuma alteração nas participações — contrato mantido.' };
  }
  return { tom: 'positivo', texto: 'Fechado em 100% — salvar cria um novo contrato vigente.' };
}

const MILISSEGUNDOS_POR_DIA = 24 * 60 * 60 * 1000;

/** Dias de hoje até uma data ISO (negativo é passado), em dias de calendário. */
export function diasAte(iso: string | undefined, hoje = new Date()): number | undefined {
  if (!iso) {
    return undefined;
  }
  const [ano, mes, dia] = iso.split('-').map(Number);
  const alvo = Date.UTC(ano ?? 0, (mes ?? 1) - 1, dia ?? 1);
  const base = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return Math.round((alvo - base) / MILISSEGUNDOS_POR_DIA);
}

/**
 * "vence em 40 dias" / "vencida há 20 dias" / "" sem data. O julgamento (vencida ou não) é do
 * servidor; aqui só se escreve o prazo — o cliente nunca decide validade sozinho.
 */
export function prazoDaValidade(
  iso: string | undefined,
  vencida: boolean | undefined,
  hoje = new Date(),
): string {
  const dias = diasAte(iso, hoje);
  if (dias === undefined) {
    return '';
  }
  const prazo = prazoEmPalavras(dias);
  if (vencida) {
    // O servidor julga em UTC e o navegador conta em hora local: perto da meia-noite o servidor
    // já diz "vencida" com o cliente ainda em 0 dias. A redação segue o julgamento.
    if (dias >= 0) {
      return 'vencida hoje';
    }
    return prazo.startsWith('venceu') ? prazo.replace('venceu', 'vencida') : `vencida ${prazo}`;
  }
  return prazo.startsWith('vence') ? prazo : `vence ${prazo}`;
}

/**
 * "Cessna Citation XLS+" — fabricante e modelo, sem repetir o fabricante quando o modelo já o
 * traz (o cadastro aceita "Citation XLS+" e "Cessna Citation XLS+" no mesmo campo).
 */
export function nomeDaAeronave(fabricante: string | undefined, modelo: string | undefined): string {
  const marca = (fabricante ?? '').trim();
  const nome = (modelo ?? '').trim();
  if (!marca) {
    return nome;
  }
  if (!nome || nome.toLowerCase().startsWith(marca.toLowerCase())) {
    return nome || marca;
  }
  return `${marca} ${nome}`;
}
