package br.com.aerodash.aether.aeronave;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;

/** Os valores em reais têm o {@code @Digits} da coluna, NUMERIC(14,2). */
@Schema(description = "Rateio e fundo da aeronave")
public record ConfiguracaoFinanceiraRequest(
    @NotNull(message = "Escolha a base do rateio.") BaseDoRateio baseDoRateio,
    @NotNull(message = "Escolha o modelo de aporte.") ModeloDeAporte modeloDeAporte,
    @NotNull(message = "Informe a periodicidade do aporte.") Integer periodicidadeDoAporteMeses,
    @Schema(description = "Valor de cada aporte no modelo FIXO; ignorado no proporcional ao uso")
        @PositiveOrZero(message = "O valor do aporte não pode ser negativo.")
        @Digits(
            integer = 12,
            fraction = 2,
            message =
                "O valor do aporte vai até R$ 999.999.999.999,99, com no máximo duas casas"
                    + " decimais.")
        BigDecimal valorDoAporte,
    @NotNull(message = "Informe o dia de fechamento.")
        @Min(value = 1, message = "O dia de fechamento vai de 1 a 28.")
        @Max(value = 28, message = "O dia de fechamento vai de 1 a 28.")
        Integer diaDeFechamento,
    @Schema(description = "Saldo atual do fundo; negativo quando os proprietários devem")
        @NotNull(message = "Informe o saldo atual do fundo.")
        @Digits(
            integer = 12,
            fraction = 2,
            message =
                "O saldo vai até R$ 999.999.999.999,99, para mais ou para menos, com no máximo"
                    + " duas casas decimais.")
        BigDecimal saldoDeAbertura) {}
