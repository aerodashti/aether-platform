package br.com.aerodash.aether.fechamento;

import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.YearMonth;

/** Uma aeronave na Visão geral: o fundo, o custo e o uso de uma competência, numa linha. */
@Schema(description = "Resumo de uma aeronave numa competência, para a Visão geral")
public record ResumoDaAeronaveResponse(
    Long aeronaveId,
    String matricula,
    @Schema(type = "string", example = "2026-10") YearMonth competencia,
    @Schema(description = "Saldo do fundo no fim da competência") BigDecimal saldoDoFundo,
    BigDecimal custosFixos,
    BigDecimal custosVariaveis,
    @Schema(description = "Horas voadas na competência, manutenção incluída") BigDecimal horas,
    @Schema(
            description =
                "Meses que o saldo paga, pela média de custo das três competências anteriores;"
                    + " nula sem custo para medir")
        BigDecimal coberturaEmMeses) {}
