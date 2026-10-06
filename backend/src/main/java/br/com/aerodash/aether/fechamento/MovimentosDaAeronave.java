package br.com.aerodash.aether.fechamento;

import br.com.aerodash.aether.aeronave.BaseDoRateio;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

/**
 * Tudo o que o fechamento de uma aeronave lê, já traduzido das features donas: custos, horas
 * voadas, aportes, rendimentos, os contratos e a configuração do rateio.
 */
record MovimentosDaAeronave(
    BaseDoRateio baseDoRateio,
    BigDecimal saldoDeAbertura,
    List<QuadroDeParticipacao> quadros,
    List<Custo> custos,
    List<Horas> horas,
    List<Aporte> aportes,
    List<Rendimento> rendimentos) {

  /** Um custo: atribuído a um proprietário, ou rateado (proprietário nulo). */
  record Custo(
      LocalDate data, boolean fixo, Long proprietarioId, String relatorioDeVoo, BigDecimal valor) {}

  /** Um trecho voado. Proprietário nulo é voo de manutenção: não conta como uso de ninguém. */
  record Horas(LocalDate data, String relatorioDeVoo, Long proprietarioId, BigDecimal horas) {}

  record Aporte(YearMonth competencia, Long proprietarioId, BigDecimal valor) {}

  record Rendimento(LocalDate data, BigDecimal valor) {}
}
