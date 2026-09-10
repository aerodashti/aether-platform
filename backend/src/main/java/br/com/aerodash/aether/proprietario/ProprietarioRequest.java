package br.com.aerodash.aether.proprietario;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Cadastro ou atualização de um proprietário. O mesmo corpo serve aos dois: a tela edita os mesmos
 * campos que cria, e a situação não está aqui de propósito — ela muda por ação própria (desativação
 * e reativação), nunca por edição de cadastro.
 */
@Schema(description = "Dados cadastrais de um proprietário")
public record ProprietarioRequest(
    @Schema(description = "Nome ou nome fantasia", example = "Ricardo Meirelles")
        @NotBlank(message = "Informe o nome do proprietário.")
        @Size(max = 120, message = "O nome pode ter no máximo 120 caracteres.")
        String nome,
    @Schema(description = "CPF ou CNPJ, com ou sem pontuação", example = "123.456.789-01")
        @Size(max = 20, message = "CPF ou CNPJ pode ter no máximo 20 caracteres.")
        String cpfCnpj,
    @Schema(description = "E-mail de contato", example = "ricardo@exemplo.com.br")
        @Email(message = "Informe um e-mail válido.")
        @Size(max = 180, message = "O e-mail pode ter no máximo 180 caracteres.")
        String email,
    @Schema(description = "Telefone de contato", example = "+55 11 98888-0000")
        @Size(max = 20, message = "O telefone pode ter no máximo 20 caracteres.")
        String telefone,
    @Schema(description = "Cor de identificação na interface", example = "PETROLEO")
        @NotNull(message = "Escolha a cor de identificação.")
        CorDeIdentificacao corDeIdentificacao) {}
