import type { CategoriaDeCusto, CustoResponse, TipoDeCusto } from '../api/useCustos';

export const ROTULO_DO_TIPO: Record<TipoDeCusto, string> = {
  FIXO: 'Fixo',
  VARIAVEL: 'Variável',
};

/** Categoria → rótulo e tipo. A amarração vem do servidor; aqui é só redação de tela. */
export const CATEGORIAS: Record<CategoriaDeCusto, { rotulo: string; tipo: TipoDeCusto }> = {
  FOLHA_TRIPULACAO: { rotulo: 'Folha tripulação', tipo: 'FIXO' },
  HANGARAGEM: { rotulo: 'Hangaragem', tipo: 'FIXO' },
  MANUTENCAO_PROGRAMADA: { rotulo: 'Manutenção programada', tipo: 'FIXO' },
  SEGURO: { rotulo: 'Seguro', tipo: 'FIXO' },
  ASSINATURAS_OPERACIONAIS: { rotulo: 'Assinaturas operacionais', tipo: 'FIXO' },
  LIMPEZA_MENSAL: { rotulo: 'Limpeza mensal', tipo: 'FIXO' },
  TAXA_DE_ADMINISTRACAO: { rotulo: 'Taxa de administração', tipo: 'FIXO' },
  LEASING: { rotulo: 'Leasing', tipo: 'FIXO' },
  PUBLICACOES_TECNICAS: { rotulo: 'Publicações técnicas', tipo: 'FIXO' },
  ABASTECIMENTO: { rotulo: 'Abastecimento', tipo: 'VARIAVEL' },
  TARIFAS_AEROPORTUARIAS: { rotulo: 'Tarifas aeroportuárias', tipo: 'VARIAVEL' },
  COMISSARIA: { rotulo: 'Comissária', tipo: 'VARIAVEL' },
  ACERTO_DE_VIAGEM: { rotulo: 'Acerto de viagem', tipo: 'VARIAVEL' },
  COORDENACAO_VOO_INTERNACIONAL: { rotulo: 'Coordenação voo internacional', tipo: 'VARIAVEL' },
  DESPESAS_COM_FREELANCER: { rotulo: 'Despesas com freelancer', tipo: 'VARIAVEL' },
};

export function categoriasDoTipo(tipo: TipoDeCusto): CategoriaDeCusto[] {
  return (Object.keys(CATEGORIAS) as CategoriaDeCusto[]).filter(
    (categoria) => CATEGORIAS[categoria].tipo === tipo,
  );
}

const MOEDA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const DATA = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
});

export function moedaEmTexto(valor: number | undefined): string {
  return valor === undefined ? '—' : MOEDA.format(valor);
}

export function dataCurta(iso: string | undefined): string {
  return iso ? DATA.format(new Date(`${iso}T00:00:00`)) : '—';
}

export function competenciaAtual(): string {
  return new Date().toISOString().slice(0, 7);
}

export const ATRIBUICAO_RATEADA = 'Rateio entre os proprietários';

/**
 * O CSV do recorte, gerado aqui porque é o recorte da tela — o mesmo que os olhos estão vendo.
 * Ponto e vírgula como separador: é o que o Excel brasileiro espera.
 */
export function csvDosLancamentos(custos: CustoResponse[]): string {
  const cabecalho = 'Descrição;Data;Rel-voo;Tipo;Categoria;Atribuição;NF;Moeda;Valor (BRL)';
  const linhas = custos.map((custo) =>
    [
      `"${(custo.descricao ?? '').replaceAll('"', '""')}"`,
      custo.data ?? '',
      custo.relatorioDeVoo ?? '',
      custo.tipo ? ROTULO_DO_TIPO[custo.tipo] : '',
      custo.categoria ? CATEGORIAS[custo.categoria].rotulo : '',
      custo.rateado ? ATRIBUICAO_RATEADA : (custo.nomeDoProprietario ?? ''),
      custo.notaFiscal ?? '',
      custo.moeda ?? '',
      String(custo.valor ?? '').replace('.', ','),
    ].join(';'),
  );
  return [cabecalho, ...linhas].join('\n');
}
