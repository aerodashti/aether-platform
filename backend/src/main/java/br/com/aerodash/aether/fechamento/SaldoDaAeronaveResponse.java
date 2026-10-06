package br.com.aerodash.aether.fechamento;

import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.List;

/**
 * O saldo do fundo de uma aeronave no fim da competência corrente e a conta de cada proprietário: o
 * número que a frota, o detalhe e os cartões de proprietário mostram sem abrir o fechamento.
 */
@Schema(description = "Saldo do fundo de uma aeronave e de cada proprietário nele")
public record SaldoDaAeronaveResponse(
    Long aeronaveId,
    @Schema(type = "string", example = "2026-10") YearMonth competencia,
    BigDecimal saldoDoFundo,
    @Schema(description = "Custos da competência corrente") BigDecimal custoDaCompetencia,
    List<Conta> contas) {

  @Schema(description = "A conta de um proprietário no fundo")
  public record Conta(
      Long proprietarioId,
      @Schema(description = "Positivo é crédito; negativo, dívida") BigDecimal saldo,
      @Schema(description = "Fatia dos custos da competência; nula quando não houve custo")
          BigDecimal percentualNoRateio) {}
}
