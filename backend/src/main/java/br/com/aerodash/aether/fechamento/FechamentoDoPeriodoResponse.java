package br.com.aerodash.aether.fechamento;

import br.com.aerodash.aether.aeronave.BaseDoRateio;
import br.com.aerodash.aether.aeronave.ModeloDeAporte;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.List;

/** Uma linha por competência do período, com o saldo do fundo no fim de cada uma. */
@Schema(description = "Fechamento de um período de competências de uma aeronave")
public record FechamentoDoPeriodoResponse(
    Long aeronaveId,
    String matricula,
    @Schema(type = "string", example = "2026-01") YearMonth de,
    @Schema(type = "string", example = "2026-09") YearMonth ate,
    @Schema(description = "As regras de hoje da aeronave, as mesmas dos chips do mensal")
        BaseDoRateio baseDoRateio,
    ModeloDeAporte modeloDeAporte,
    List<Competencia> competencias,
    @Schema(description = "Somas do período; o saldo é o do fim do período") Competencia totais) {

  @Schema(description = "O fechamento resumido de uma competência")
  public record Competencia(
      @Schema(type = "string", example = "2026-09") YearMonth competencia,
      BigDecimal horas,
      BigDecimal custosFixos,
      BigDecimal custosVariaveis,
      BigDecimal totalDeCustos,
      BigDecimal aportes,
      BigDecimal rendimentos,
      BigDecimal resultado,
      BigDecimal saldoFinal) {}
}
