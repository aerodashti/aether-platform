package br.com.aerodash.aether.manutencao;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

/** Agendamento ou correção de uma manutenção. */
@Schema(description = "Evento de manutenção")
public record ManutencaoRequest(
    @NotNull(message = "Informe a aeronave.") Long aeronaveId,
    @NotNull(message = "Informe a data.") LocalDate data,
    LocalTime hora,
    @Size(max = 120, message = "O responsável pode ter no máximo 120 caracteres.")
        String responsavel,
    @NotBlank(message = "Informe a descrição.")
        @Size(max = 200, message = "A descrição pode ter no máximo 200 caracteres.")
        String descricao,
    @Positive(message = "O valor precisa ser maior que zero.") BigDecimal valor) {}
