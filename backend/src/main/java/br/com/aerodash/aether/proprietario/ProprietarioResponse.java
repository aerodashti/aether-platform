package br.com.aerodash.aether.proprietario;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Uma linha da lista de proprietários.
 *
 * <p>Participação por aeronave e saldo do fundo não estão aqui: a tela os busca em {@code
 * /participacoes/vigentes} e no fechamento.
 */
@Schema(description = "Proprietário cadastrado")
public record ProprietarioResponse(
    @Schema(description = "Identificador", example = "1") Long id,
    @Schema(description = "Nome ou nome fantasia", example = "Ricardo Meirelles") String nome,
    @Schema(description = "CPF ou CNPJ sem pontuação, em maiúsculas", example = "12345678909")
        String cpfCnpj,
    @Schema(description = "E-mail de contato", example = "ricardo@exemplo.com.br") String email,
    @Schema(description = "Telefone de contato", example = "+55 11 98888-0000") String telefone,
    @Schema(description = "Cor de identificação na interface", example = "PETROLEO")
        CorDeIdentificacao corDeIdentificacao,
    @Schema(description = "Se participa da operação hoje", example = "ATIVO")
        SituacaoDoProprietario situacao) {}
