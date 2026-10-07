package br.com.aerodash.aether.autenticacao;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

/** O convidado chega pelo link e cria a própria senha. */
@Schema(description = "Conclusão do convite")
public record ConcluirConviteRequest(
    @NotBlank(message = "Convite inválido.")
        @Schema(description = "Token que veio no link do convite")
        String convite,
    @NotBlank(message = "Informe a nova senha.")
        @SenhaNova
        @Schema(description = "Senha escolhida pela própria pessoa: de 8 caracteres a 72 bytes")
        String novaSenha) {}
