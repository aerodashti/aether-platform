package br.com.aerodash.aether.aviso;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

/** Marca avisos como lidos ou não lidos — um, ou todos de uma vez. */
@Schema(description = "Leitura de avisos")
public record LeituraRequest(
    @NotEmpty(message = "Informe ao menos um aviso.")
        @Size(max = 500, message = "No máximo 500 avisos por vez.")
        List<@NotNull @Size(max = 120) String> chaves,
    @Schema(description = "Verdadeiro marca como lido; falso devolve a não lido") boolean lido) {}
