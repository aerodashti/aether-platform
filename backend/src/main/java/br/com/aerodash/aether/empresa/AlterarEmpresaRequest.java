package br.com.aerodash.aether.empresa;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Os dados de contato da empresa.
 *
 * <p>Sem CNPJ: ele é o documento do contrato e a tela o mostra bloqueado. Aceitá-lo aqui, mesmo
 * ignorando, convidaria alguém a tentar.
 */
@Schema(description = "Alteração dos dados da empresa")
public record AlterarEmpresaRequest(
    @NotBlank(message = "Informe o nome fantasia.")
        @Size(max = 120, message = "O nome fantasia deve ter no máximo 120 caracteres.")
        String nomeFantasia,
    @NotBlank(message = "Informe a razão social.")
        @Size(max = 180, message = "A razão social deve ter no máximo 180 caracteres.")
        String razaoSocial,
    @NotBlank(message = "Informe o e-mail.")
        @Email(message = "Informe um e-mail válido.")
        @Size(max = 180, message = "O e-mail deve ter no máximo 180 caracteres.")
        String email,
    @NotBlank(message = "Informe o telefone.")
        @Size(max = 20, message = "O telefone deve ter no máximo 20 caracteres.")
        String telefone) {}
