package br.com.aerodash.aether.aeronave;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;

/**
 * Os totais acumulados — no cadastro e na correção de administrador. Motor 2 e APU nulos significam
 * "este equipamento não tem", não zero. O {@code @Digits} é o da coluna: horas em NUMERIC(10,1) e
 * quilômetros em NUMERIC(12,1).
 */
@Schema(description = "Correção dos totais acumulados da aeronave")
public record ContadoresRequest(
    @NotNull(message = "Informe as horas de célula.")
        @PositiveOrZero(message = "Horas de célula não podem ser negativas.")
        @Digits(
            integer = 9,
            fraction = 1,
            message = "As horas de célula vão até 999.999.999,9, com no máximo uma casa decimal.")
        BigDecimal horasDeCelula,
    @NotNull(message = "Informe os ciclos.")
        @PositiveOrZero(message = "Ciclos não podem ser negativos.")
        Integer ciclos,
    @NotNull(message = "Informe os quilômetros voados.")
        @PositiveOrZero(message = "Quilômetros não podem ser negativos.")
        @Digits(
            integer = 11,
            fraction = 1,
            message =
                "Os quilômetros voados vão até 99.999.999.999,9, com no máximo uma casa decimal.")
        BigDecimal kmVoados,
    @PositiveOrZero(message = "Horas de motor não podem ser negativas.")
        @Digits(
            integer = 9,
            fraction = 1,
            message = "As horas de motor vão até 999.999.999,9, com no máximo uma casa decimal.")
        BigDecimal horasMotor1,
    @PositiveOrZero(message = "Horas de motor não podem ser negativas.")
        @Digits(
            integer = 9,
            fraction = 1,
            message = "As horas de motor vão até 999.999.999,9, com no máximo uma casa decimal.")
        BigDecimal horasMotor2,
    @PositiveOrZero(message = "Horas de motor não podem ser negativas.")
        @Digits(
            integer = 9,
            fraction = 1,
            message = "As horas de motor vão até 999.999.999,9, com no máximo uma casa decimal.")
        BigDecimal horasMotor3,
    @PositiveOrZero(message = "Horas de APU não podem ser negativas.")
        @Digits(
            integer = 9,
            fraction = 1,
            message = "As horas de APU vão até 999.999.999,9, com no máximo uma casa decimal.")
        BigDecimal horasApu) {}
