package br.com.aerodash.aether.custo;

/**
 * As categorias do produto, cada uma amarrada ao seu tipo: hangaragem não vira custo variável por
 * escolha de quem digita. A lista vem do handoff e cresce por migration, não por texto livre —
 * categoria livre destruiria a análise de composição de custo.
 */
public enum CategoriaDeCusto {
  // Fixos: existem com ou sem voo.
  FOLHA_TRIPULACAO(TipoDeCusto.FIXO),
  HANGARAGEM(TipoDeCusto.FIXO),
  MANUTENCAO_PROGRAMADA(TipoDeCusto.FIXO),
  SEGURO(TipoDeCusto.FIXO),
  ASSINATURAS_OPERACIONAIS(TipoDeCusto.FIXO),
  LIMPEZA_MENSAL(TipoDeCusto.FIXO),
  TAXA_DE_ADMINISTRACAO(TipoDeCusto.FIXO),
  LEASING(TipoDeCusto.FIXO),
  PUBLICACOES_TECNICAS(TipoDeCusto.FIXO),
  // Variáveis: nascem de voar.
  ABASTECIMENTO(TipoDeCusto.VARIAVEL),
  TARIFAS_AEROPORTUARIAS(TipoDeCusto.VARIAVEL),
  COMISSARIA(TipoDeCusto.VARIAVEL),
  ACERTO_DE_VIAGEM(TipoDeCusto.VARIAVEL),
  COORDENACAO_VOO_INTERNACIONAL(TipoDeCusto.VARIAVEL),
  DESPESAS_COM_FREELANCER(TipoDeCusto.VARIAVEL);

  private final TipoDeCusto tipo;

  CategoriaDeCusto(TipoDeCusto tipo) {
    this.tipo = tipo;
  }

  public TipoDeCusto getTipo() {
    return tipo;
  }

  public boolean pertenceAoTipo(TipoDeCusto candidato) {
    return tipo == candidato;
  }
}
