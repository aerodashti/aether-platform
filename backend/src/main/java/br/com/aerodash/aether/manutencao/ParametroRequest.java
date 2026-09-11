package br.com.aerodash.aether.manutencao;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

/** Um limite monitorado: numérico para horas e ciclos, data para o calendário. */
@Schema(description = "Parâmetro de controle")
public record ParametroRequest(
    @NotNull(message = "Informe a aeronave.") Long aeronaveId,
    @NotBlank(message = "Informe o nome do parâmetro.")
        @Size(max = 120, message = "O nome pode ter no máximo 120 caracteres.")
        String nome,
    @NotNull(message = "Escolha o tipo do parâmetro.") TipoDeParametro tipo,
    @Positive(message = "O limite precisa ser maior que zero.") BigDecimal limite,
    LocalDate dataLimite,
    @NotNull(message = "Informe a faixa de aviso.")
        @Positive(message = "A faixa de aviso precisa ser maior que zero.")
        BigDecimal aviso) {}
