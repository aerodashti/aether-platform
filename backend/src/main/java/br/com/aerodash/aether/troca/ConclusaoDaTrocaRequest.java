package br.com.aerodash.aether.troca;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

/**
 * A devolução das horas, com a data em que ela aconteceu: quem registra dias depois não pode ficar
 * com a data do clique.
 */
@Schema(description = "A devolução de uma troca de KM")
public record ConclusaoDaTrocaRequest(
    @Schema(description = "Data da devolução: entre a data da troca e hoje")
        @NotNull(message = "Informe a data da devolução.")
        LocalDate concluidaEm) {}
