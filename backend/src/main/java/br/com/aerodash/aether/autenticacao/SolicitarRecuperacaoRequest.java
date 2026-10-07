package br.com.aerodash.aether.autenticacao;

import br.com.aerodash.aether.comum.validacao.FormatoDeEmail;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/** Pedido do código de seis dígitos. */
@Schema(description = "Pedido de código de recuperação")
public record SolicitarRecuperacaoRequest(
    @Schema(description = "E-mail cadastrado", example = "leonardo@administraair.com.br")
        @NotBlank(message = "Informe o e-mail.")
        @Email(regexp = FormatoDeEmail.EXPRESSAO, message = FormatoDeEmail.MENSAGEM)
        String email) {}
