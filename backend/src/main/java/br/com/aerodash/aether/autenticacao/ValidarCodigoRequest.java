package br.com.aerodash.aether.autenticacao;

import br.com.aerodash.aether.comum.validacao.FormatoDeEmail;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/** Conferência do código antes de deixar a pessoa escolher a senha nova. */
@Schema(description = "Conferência do código de recuperação")
public record ValidarCodigoRequest(
    @Schema(description = "E-mail cadastrado")
        @NotBlank(message = "Informe o e-mail.")
        @Email(regexp = FormatoDeEmail.EXPRESSAO, message = FormatoDeEmail.MENSAGEM)
        String email,
    @Schema(description = "Código de seis dígitos recebido por e-mail", example = "519274")
        @NotBlank(message = "Informe o código.")
        @Pattern(regexp = "\\d{6}", message = "O código tem seis dígitos.")
        String codigo) {}
