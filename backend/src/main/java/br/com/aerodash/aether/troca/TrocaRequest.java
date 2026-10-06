package br.com.aerodash.aether.troca;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

/** Registro ou correção de uma troca de KM. */
@Schema(description = "Horas cedidas entre proprietários de uma aeronave")
public record TrocaRequest(
    @NotNull(message = "Informe a aeronave.") Long aeronaveId,
    @NotNull(message = "Informe a data da troca.") LocalDate data,
    @Schema(description = "Quem cedeu as horas") @NotNull(message = "Informe quem cedeu.")
        Long cedenteId,
    @Schema(description = "Quem recebeu e vai devolver") @NotNull(message = "Informe quem recebeu.")
        Long recebedorId,
    @NotNull(message = "Informe as horas voadas.")
        @Positive(message = "As horas precisam ser maiores que zero.")
        BigDecimal horas,
    @PositiveOrZero(message = "O KM não pode ser negativo.") BigDecimal km,
    @Schema(description = "Valor combinado por hora, para acerto em dinheiro")
        @Positive(message = "O valor por hora precisa ser maior que zero.")
        BigDecimal valorPorHora,
    @Size(max = 20, message = "O Rel. Voo pode ter no máximo 20 caracteres.") String relatorioDeVoo,
    @Size(max = 300, message = "A observação pode ter no máximo 300 caracteres.")
        String observacao) {}
