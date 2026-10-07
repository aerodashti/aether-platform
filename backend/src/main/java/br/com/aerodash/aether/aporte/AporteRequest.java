package br.com.aerodash.aether.aporte;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;

/**
 * Registro ou correção de um aporte.
 *
 * <p>O valor tem o limite da coluna ({@code NUMERIC(14,2)}) e o mesmo de {@code
 * validacaoDoAporte.ts}: o que passa daqui o banco arredondaria em silêncio ou recusaria. A faixa
 * da data e da competência depende de hoje, e quem a confere é a entidade.
 */
@Schema(description = "Um aporte de proprietário no fundo da aeronave")
public record AporteRequest(
    @NotNull(message = "Informe a aeronave.") Long aeronaveId,
    @NotNull(message = "Informe o proprietário.") Long proprietarioId,
    @Schema(description = "Quando o crédito caiu na conta")
        @NotNull(message = "Informe a data do crédito.")
        LocalDate data,
    @Schema(type = "string", example = "2026-09", description = "Mês a que o aporte se refere")
        @NotNull(message = "Informe a competência.")
        YearMonth competencia,
    @NotNull(message = "Informe o valor.")
        @Positive(message = "O valor precisa ser maior que zero.")
        @Digits(integer = 12, fraction = 2, message = AporteRequest.MENSAGEM_DO_VALOR)
        BigDecimal valor) {

  static final String MENSAGEM_DO_VALOR =
      "O valor vai até 999.999.999.999,99, com no máximo duas casas decimais.";
}
