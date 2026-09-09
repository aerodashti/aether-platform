package br.com.aerodash.aether.autenticacao;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Troca efetiva da senha. O código volta a ser conferido aqui: validar não consome nem reserva
 * nada, então o passo final não pode confiar em que a tela já perguntou.
 */
@Schema(description = "Redefinição de senha com o código recebido")
public record RedefinirSenhaRequest(
    @Schema(description = "E-mail cadastrado")
        @NotBlank(message = "Informe o e-mail.")
        @Email(message = "Informe um e-mail válido.")
        String email,
    @Schema(description = "Código de seis dígitos recebido por e-mail", example = "519274")
        @NotBlank(message = "Informe o código.")
        @Pattern(regexp = "\\d{6}", message = "O código tem seis dígitos.")
        String codigo,
    @Schema(description = "Senha nova, de no mínimo oito caracteres")
        @NotBlank(message = "Informe a nova senha.")
        @Size(min = 8, message = "A nova senha precisa de ao menos 8 caracteres.")
        String novaSenha) {}
