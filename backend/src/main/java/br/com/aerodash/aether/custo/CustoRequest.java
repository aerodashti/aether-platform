package br.com.aerodash.aether.custo;

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
 * Lançamento ou correção de custo. O tipo não viaja: é consequência da categoria. Em USD, o {@code
 * valor} é o valor original e o {@code cambio} é obrigatório — o BRL é derivado no servidor, uma
 * vez.
 *
 * <p>Os limites são os das colunas ({@code NUMERIC(14,2)} no valor, {@code NUMERIC(10,4)} no
 * câmbio) e os mesmos de {@code validacaoDoCusto.ts}: o que passa daqui o banco arredondaria ou
 * recusaria.
 */
@Schema(description = "Um lançamento de custo")
public record CustoRequest(
    @NotNull(message = "Informe a aeronave.") Long aeronaveId,
    @NotNull(message = "Escolha a categoria.") CategoriaDeCusto categoria,
    @NotNull(message = "Informe a data do custo.") LocalDate data,
    @NotBlank(message = "Informe a descrição.")
        @Size(max = 200, message = "A descrição pode ter no máximo 200 caracteres.")
        String descricao,
    @Size(max = 20, message = "O relatório de voo pode ter no máximo 20 caracteres.")
        String relatorioDeVoo,
    @Schema(description = "Quem paga; nulo é rateado entre todos") Long proprietarioId,
    @Size(max = 40, message = "A nota fiscal pode ter no máximo 40 caracteres.") String notaFiscal,
    @NotNull(message = "Escolha a moeda.") MoedaDoCusto moeda,
    @NotNull(message = "Informe o valor.")
        @Positive(message = "O valor precisa ser maior que zero.")
        @Digits(integer = 12, fraction = 2, message = MENSAGEM_DO_VALOR)
        BigDecimal valor,
    @Schema(description = "Reais por dólar, no dia do lançamento; só em USD")
        @Positive(message = "O câmbio precisa ser maior que zero.")
        @DecimalMax(value = "100", message = MENSAGEM_DO_CAMBIO)
        @Digits(integer = 3, fraction = 4, message = MENSAGEM_DO_CAMBIO)
        BigDecimal cambio) {

  static final String MENSAGEM_DO_VALOR =
      "O valor vai até 999.999.999.999,99, com no máximo duas casas decimais.";

  static final String MENSAGEM_DO_CAMBIO =
      "O câmbio vai até R$ 100 por US$ 1, com no máximo quatro casas decimais.";
}
