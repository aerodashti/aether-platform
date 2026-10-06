package br.com.aerodash.aether.aporte;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

/** Registro ou correção de um rendimento. Saldo aplicado e taxa são opcionais: são o extrato. */
@Schema(description = "Um rendimento da aplicação do fundo")
public record RendimentoRequest(
    @NotNull(message = "Informe a aeronave.") Long aeronaveId,
    @NotNull(message = "Informe a data do crédito.") LocalDate data,
    @NotBlank(message = "Informe a aplicação.")
        @Size(max = 60, message = "A aplicação pode ter no máximo 60 caracteres.")
        String aplicacao,
    @Positive(message = "O saldo aplicado precisa ser maior que zero.") BigDecimal saldoAplicado,
    @Schema(description = "Taxa do mês, em %")
        @Positive(message = "A taxa precisa ser maior que zero.")
        BigDecimal taxa,
    @NotNull(message = "Informe o rendimento.")
        @Positive(message = "O rendimento precisa ser maior que zero.")
        BigDecimal valor) {}
