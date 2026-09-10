package br.com.aerodash.aether.aeronave;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import java.math.BigDecimal;
import java.util.Set;

/**
 * Como os custos desta aeronave são rateados e como o fundo é abastecido.
 *
 * <p>Mora na aeronave, e não numa tabela própria, porque é UMA configuração por aeronave e toda
 * pergunta que ela responde ("como divido este custo?") já chega com a aeronave na mão.
 */
@Embeddable
public record ConfiguracaoFinanceira(
    @Enumerated(EnumType.STRING) @Column(name = "base_do_rateio", nullable = false)
        BaseDoRateio baseDoRateio,
    @Enumerated(EnumType.STRING) @Column(name = "modelo_de_aporte", nullable = false)
        ModeloDeAporte modeloDeAporte,
    @Column(name = "periodicidade_do_aporte_meses", nullable = false)
        int periodicidadeDoAporteMeses,
    @Column(name = "valor_do_aporte") BigDecimal valorDoAporte,
    @Column(name = "dia_de_fechamento", nullable = false) int diaDeFechamento) {

  /** As periodicidades que existem no produto; qualquer outra é erro de entrada. */
  public static final Set<Integer> PERIODICIDADES_VALIDAS = Set.of(1, 2, 3, 4, 6, 12);

  /** O padrão de quem ainda não configurou: rateio por uso, aporte fixo mensal, fatura no dia 1. */
  public static ConfiguracaoFinanceira padrao() {
    return new ConfiguracaoFinanceira(BaseDoRateio.POR_USO, ModeloDeAporte.FIXO, 1, null, 1);
  }

  public boolean possuiPeriodicidadeValida() {
    return PERIODICIDADES_VALIDAS.contains(periodicidadeDoAporteMeses);
  }

  /** Até 28 para o dia existir em todo mês: fevereiro decide o teto. */
  public boolean possuiDiaDeFechamentoValido() {
    return diaDeFechamento >= 1 && diaDeFechamento <= 28;
  }
}
