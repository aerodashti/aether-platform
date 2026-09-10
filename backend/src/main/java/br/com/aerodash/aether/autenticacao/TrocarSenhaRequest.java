package br.com.aerodash.aether.autenticacao;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Trocar a própria senha: o que se sabe, o que se quer e o que chegou por e-mail. */
@Schema(description = "Troca da própria senha")
public record TrocarSenhaRequest(
    @NotBlank(message = "Informe a senha atual.") String senhaAtual,
    @NotBlank(message = "Informe a nova senha.")
        @Size(min = 8, max = 72, message = "A senha deve ter entre 8 e 72 caracteres.")
        String novaSenha,
    @NotBlank(message = "Informe o código enviado por e-mail.")
        @Pattern(regexp = "\\d{6}", message = "O código tem seis dígitos.")
        @Schema(description = "Código de seis dígitos", example = "042917")
        String codigo) {}
