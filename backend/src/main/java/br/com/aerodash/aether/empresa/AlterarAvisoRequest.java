package br.com.aerodash.aether.empresa;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * Com quantos dias de antecedência avisar antes de um documento vencer.
 *
 * <p>{@code Integer}, e não {@code int}: com o primitivo, o campo ausente virava zero e a resposta
 * dizia "pelo menos 1 dia" a quem não tinha mandado nada.
 */
@Schema(description = "Antecedência do aviso de vencimento")
public record AlterarAvisoRequest(
    @NotNull(message = "Informe a antecedência, em dias.")
        @Min(value = 1, message = "O aviso deve ser de pelo menos 1 dia.")
        @Max(value = 365, message = "O aviso deve ser de no máximo 365 dias.")
        @Schema(description = "Dias de antecedência", example = "30")
        Integer diasDeAviso) {}
