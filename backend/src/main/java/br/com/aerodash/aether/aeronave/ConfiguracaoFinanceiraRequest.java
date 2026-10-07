package br.com.aerodash.aether.aeronave;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;

/**
 * Os valores em reais têm o limite da coluna, NUMERIC(14,2): até 999.999.999.999,99 e duas casas.
 * Acima disso o banco recusaria com 500; com três casas, arredondaria em silêncio.
 */
@Schema(description = "Rateio e fundo da aeronave")
public record ConfiguracaoFinanceiraRequest(
    @NotNull(message = "Escolha a base do rateio.") BaseDoRateio baseDoRateio,
    @NotNull(message = "Escolha o modelo de aporte.") ModeloDeAporte modeloDeAporte,
    @NotNull(message = "Informe a periodicidade do aporte.") Integer periodicidadeDoAporteMeses,
    @Schema(
            description =
                "Quanto se cobra a cada período no aporte fixo, maior que zero. No proporcional ao"
                    + " uso não se aplica e é descartado.")
        @PositiveOrZero(message = "O valor do aporte não pode ser negativo.")
        @Digits(
            integer = 12,
            fraction = 2,
            message = "O valor do aporte vai até 999.999.999.999,99, com duas casas decimais.")
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
                "O saldo vai até 999.999.999.999,99, para mais ou para menos, com duas casas"
                    + " decimais.")
        BigDecimal saldoDeAbertura) {}
