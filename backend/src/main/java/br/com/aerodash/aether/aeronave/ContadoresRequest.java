package br.com.aerodash.aether.aeronave;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;

/**
 * Correção manual dos totais acumulados — rota de administrador. Motor 2 e APU nulos significam
 * "este equipamento não tem", não zero.
 */
@Schema(description = "Correção dos totais acumulados da aeronave")
public record ContadoresRequest(
    @NotNull(message = "Informe as horas de célula.")
        @PositiveOrZero(message = "Horas de célula não podem ser negativas.")
        BigDecimal horasDeCelula,
    @NotNull(message = "Informe os ciclos.")
        @PositiveOrZero(message = "Ciclos não podem ser negativos.")
        Integer ciclos,
    @NotNull(message = "Informe os quilômetros voados.")
        @PositiveOrZero(message = "Quilômetros não podem ser negativos.")
        BigDecimal kmVoados,
    @PositiveOrZero(message = "Horas de motor não podem ser negativas.") BigDecimal horasMotor1,
    @PositiveOrZero(message = "Horas de motor não podem ser negativas.") BigDecimal horasMotor2,
    @PositiveOrZero(message = "Horas de APU não podem ser negativas.") BigDecimal horasApu) {}
