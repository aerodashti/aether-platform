package br.com.aerodash.aether.autenticacao;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/** Credenciais digitadas na tela de login. */
@Schema(description = "Credenciais de entrada")
public record EntrarRequest(
    @Schema(description = "E-mail cadastrado", example = "leonardo@administraair.com.br")
        @NotBlank(message = "Informe o e-mail.")
        @Email(message = "Informe um e-mail válido.")
        String email,
    @Schema(description = "Senha da conta") @NotBlank(message = "Informe a senha.") String senha) {}
