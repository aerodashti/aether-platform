package br.com.aerodash.aether.aporte;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Registro ou correção de um rendimento. Saldo aplicado e taxa são opcionais: são o extrato.
 *
 * <p>Os limites são os das colunas ({@code NUMERIC(14,2)} nos valores, {@code NUMERIC(7,4)} na
 * taxa), a taxa vai até 10% ao mês, e são os mesmos de {@code validacaoDoRendimento.ts}: o que
 * passa daqui o banco arredondaria em silêncio ou recusaria.
 */
@Schema(description = "Um rendimento da aplicação do fundo")
public record RendimentoRequest(
    @NotNull(message = "Informe a aeronave.") Long aeronaveId,
    @NotNull(message = "Informe a data do crédito.") LocalDate data,
    @NotBlank(message = "Informe a aplicação.")
        @Size(max = 60, message = "A aplicação pode ter no máximo 60 caracteres.")
        String aplicacao,
    @Positive(message = "O saldo aplicado precisa ser maior que zero.")
        @Digits(integer = 12, fraction = 2, message = RendimentoRequest.MENSAGEM_DO_SALDO)
        BigDecimal saldoAplicado,
    @Schema(description = "Taxa do mês, em %")
        @Positive(message = "A taxa precisa ser maior que zero.")
        @DecimalMax(value = "10", message = RendimentoRequest.MENSAGEM_DA_TAXA)
        @Digits(integer = 3, fraction = 4, message = RendimentoRequest.MENSAGEM_DA_TAXA)
        BigDecimal taxa,
    @NotNull(message = "Informe o rendimento.")
        @Positive(message = "O rendimento precisa ser maior que zero.")
        @Digits(integer = 12, fraction = 2, message = RendimentoRequest.MENSAGEM_DO_VALOR)
        BigDecimal valor) {

  static final String MENSAGEM_DO_SALDO =
      "O saldo aplicado vai até 999.999.999.999,99, com no máximo duas casas decimais.";

  static final String MENSAGEM_DA_TAXA =
      "A taxa vai até 10% ao mês, com no máximo quatro casas decimais.";

  static final String MENSAGEM_DO_VALOR =
      "O rendimento vai até 999.999.999.999,99, com no máximo duas casas decimais.";
}
