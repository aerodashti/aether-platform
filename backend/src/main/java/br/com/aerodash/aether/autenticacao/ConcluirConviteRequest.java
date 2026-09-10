package br.com.aerodash.aether.autenticacao;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** O convidado chega pelo link e cria a própria senha. */
@Schema(description = "Conclusão do convite")
public record ConcluirConviteRequest(
    @NotBlank(message = "Convite inválido.")
        @Schema(description = "Token que veio no link do convite")
        String convite,
    @NotBlank(message = "Informe a nova senha.")
        @Size(min = 8, max = 72, message = "A senha deve ter entre 8 e 72 caracteres.")
        @Schema(description = "Senha escolhida pela própria pessoa")
        String novaSenha) {}
