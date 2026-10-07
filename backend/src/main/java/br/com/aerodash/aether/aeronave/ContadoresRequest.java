package br.com.aerodash.aether.aeronave;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;

/**
 * Os totais acumulados — no cadastro e na correção de administrador. Motor 2 e APU nulos significam
 * "este equipamento não tem", não zero.
 *
 * <p>Os limites são os das colunas: horas em NUMERIC(10,1) e km em NUMERIC(12,1). Uma casa a mais
 * seria arredondada em silêncio pelo banco, e um número maior que a coluna viraria 500.
 */
@Schema(description = "Totais acumulados da aeronave, no cadastro e na correção manual")
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
        @Digits(integer = 9, fraction = 1, message = ContadoresRequest.HORAS_DE_MOTOR)
        BigDecimal horasMotor1,
    @PositiveOrZero(message = "Horas de motor não podem ser negativas.")
        @Digits(integer = 9, fraction = 1, message = ContadoresRequest.HORAS_DE_MOTOR)
        BigDecimal horasMotor2,
    @PositiveOrZero(message = "Horas de motor não podem ser negativas.")
        @Digits(integer = 9, fraction = 1, message = ContadoresRequest.HORAS_DE_MOTOR)
        BigDecimal horasMotor3,
    @PositiveOrZero(message = "Horas de APU não podem ser negativas.")
        @Digits(
            integer = 9,
            fraction = 1,
            message = "As horas de APU vão até 999.999.999,9, com no máximo uma casa decimal.")
        BigDecimal horasApu,
    @Schema(
            description =
                "Os totais que a tela mostrava ao abrir a correção. Se mudaram desde então — um voo"
                    + " lançado no meio —, a correção é recusada com 409 em vez de apagar o voo dos"
                    + " totais. Ignorado no cadastro.")
        DetalheDaAeronaveResponse.Contadores lidos) {

  static final String HORAS_DE_MOTOR =
      "As horas de motor vão até 999.999.999,9, com no máximo uma casa decimal.";
}
