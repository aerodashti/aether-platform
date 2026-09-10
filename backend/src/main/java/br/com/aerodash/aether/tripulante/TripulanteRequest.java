package br.com.aerodash.aether.tripulante;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

/** Cadastro ou atualização de um tripulante — o mesmo corpo, como no painel do protótipo. */
@Schema(description = "Dados de um tripulante da aeronave")
public record TripulanteRequest(
    @NotBlank(message = "Informe o nome do tripulante.")
        @Size(max = 120, message = "O nome pode ter no máximo 120 caracteres.")
        String nome,
    @Schema(description = "Código ANAC, com ou sem máscara", example = "123456")
        @Size(max = 12, message = "O CANAC pode ter no máximo 12 caracteres.")
        String canac,
    @NotNull(message = "Escolha a função na aeronave.") FuncaoDoTripulante funcao,
    @Schema(description = "Validade do Certificado Médico Aeronáutico") LocalDate validadeCma,
    @Schema(description = "Validade do Certificado de Habilitação Técnica") LocalDate validadeCht,
    @PositiveOrZero(message = "Horas totais não podem ser negativas.") BigDecimal horasTotais,
    @Size(max = 20, message = "O telefone pode ter no máximo 20 caracteres.") String telefone,
    @Email(message = "Informe um e-mail válido.")
        @Size(max = 180, message = "O e-mail pode ter no máximo 180 caracteres.")
        String email,
    @NotNull(message = "Informe a situação.") SituacaoDoTripulante situacao) {}
