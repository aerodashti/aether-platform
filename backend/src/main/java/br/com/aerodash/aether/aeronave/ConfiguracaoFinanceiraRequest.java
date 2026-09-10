package br.com.aerodash.aether.aeronave;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;

@Schema(description = "Rateio e fundo da aeronave")
public record ConfiguracaoFinanceiraRequest(
    @NotNull(message = "Escolha a base do rateio.") BaseDoRateio baseDoRateio,
    @NotNull(message = "Escolha o modelo de aporte.") ModeloDeAporte modeloDeAporte,
    @NotNull(message = "Informe a periodicidade do aporte.") Integer periodicidadeDoAporteMeses,
    @PositiveOrZero(message = "O valor do aporte não pode ser negativo.") BigDecimal valorDoAporte,
    @NotNull(message = "Informe o dia de fechamento.")
        @Min(value = 1, message = "O dia de fechamento vai de 1 a 28.")
        @Max(value = 28, message = "O dia de fechamento vai de 1 a 28.")
        Integer diaDeFechamento) {}
