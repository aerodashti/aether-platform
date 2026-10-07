package br.com.aerodash.aether.autenticacao;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Credenciais digitadas na tela de login.
 *
 * <p>O teto da senha é o da senha nova: nenhuma senha gravada passa dele. Recusar aqui, antes de
 * procurar o e-mail, faz a resposta sair igual para qualquer conta.
 */
@Schema(description = "Credenciais de entrada")
public record EntrarRequest(
    @Schema(description = "E-mail cadastrado", example = "leonardo@administraair.com.br")
        @NotBlank(message = "Informe o e-mail.")
        @Email(message = "Informe um e-mail válido.")
        String email,
    @Schema(description = "Senha da conta")
        @NotBlank(message = "Informe a senha.")
        @Size(max = 72, message = "A senha tem no máximo 72 caracteres.")
        String senha) {}
