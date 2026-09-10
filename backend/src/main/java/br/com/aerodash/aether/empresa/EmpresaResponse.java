package br.com.aerodash.aether.empresa;

import io.swagger.v3.oas.annotations.media.Schema;

/** Os dados da conta, como a tela de Configurações os mostra. */
@Schema(description = "A empresa dona desta instalação")
public record EmpresaResponse(
    @Schema(description = "Nome fantasia", example = "Administra Air") String nomeFantasia,
    @Schema(description = "Razão social", example = "Administra Air Gestão de Aeronaves LTDA")
        String razaoSocial,
    @Schema(description = "CNPJ, somente dígitos. Somente leitura", example = "19274653000188")
        String cnpj,
    @Schema(description = "E-mail de contato") String email,
    @Schema(description = "Telefone de contato", example = "+55 11 3000-0000") String telefone,
    @Schema(description = "Antecedência do aviso de vencimento, em dias", example = "30")
        int diasDeAviso) {}
