package br.com.aerodash.aether.manutencao;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

/** A conclusão de uma manutenção: o dia em que ela foi feita, que não é o dia do clique. */
@Schema(description = "Conclusão de uma manutenção")
public record ConclusaoRequest(
    @Schema(description = "O dia em que a manutenção foi feita; nunca no futuro")
        @NotNull(message = "Informe a data da conclusão.")
        LocalDate concluidaEm) {}
