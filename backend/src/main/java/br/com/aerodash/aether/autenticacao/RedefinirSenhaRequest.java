package br.com.aerodash.aether.autenticacao;

import br.com.aerodash.aether.comum.validacao.FormatoDeEmail;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * Troca efetiva da senha. O código volta a ser conferido aqui: validar não consome nem reserva
 * nada, então o passo final não pode confiar em que a tela já perguntou.
 */
@Schema(description = "Redefinição de senha com o código recebido")
public record RedefinirSenhaRequest(
    @Schema(description = "E-mail cadastrado")
        @NotBlank(message = "Informe o e-mail.")
        @Email(regexp = FormatoDeEmail.EXPRESSAO, message = FormatoDeEmail.MENSAGEM)
        String email,
    @Schema(description = "Código de seis dígitos recebido por e-mail", example = "519274")
        @NotBlank(message = "Informe o código.")
        @Pattern(regexp = "\\d{6}", message = "O código tem seis dígitos.")
        String codigo,
    @Schema(description = "Senha nova: de 8 caracteres a 72 bytes, e diferente da atual")
        @NotBlank(message = "Informe a nova senha.")
        @SenhaNova
        String novaSenha) {}
