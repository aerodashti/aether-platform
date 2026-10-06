package br.com.aerodash.aether.aporte;

import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;

/** Uma linha de rendimentos. A competência é o mês do crédito. */
@Schema(description = "Rendimento da aplicação do fundo")
public record RendimentoResponse(
    Long id,
    Long aeronaveId,
    String matricula,
    LocalDate data,
    @Schema(type = "string", example = "2026-09") YearMonth competencia,
    String aplicacao,
    BigDecimal saldoAplicado,
    @Schema(description = "Taxa do mês, em %") BigDecimal taxa,
    BigDecimal valor) {}
