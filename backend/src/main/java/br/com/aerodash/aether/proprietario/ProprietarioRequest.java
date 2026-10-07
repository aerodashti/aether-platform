package br.com.aerodash.aether.proprietario;

import br.com.aerodash.aether.comum.validacao.FormatoDeEmail;
import br.com.aerodash.aether.comum.validacao.FormatoDeTelefone;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Cadastro ou atualização de um proprietário. O mesmo corpo serve aos dois: a tela edita os mesmos
 * campos que cria, e a situação não está aqui de propósito — ela muda por ação própria (desativação
 * e reativação), nunca por edição de cadastro.
 *
 * <p>Os limites são os da tela ({@code validacaoDoProprietario.ts}) e os da coluna.
 */
@Schema(description = "Dados cadastrais de um proprietário")
public record ProprietarioRequest(
    @Schema(description = "Nome ou nome fantasia", example = "Ricardo Meirelles")
        @NotBlank(message = "Informe o nome do proprietário.")
        @Pattern(
            regexp = "(?s).*[\\p{L}\\p{N}].*",
            message = "O nome precisa ter ao menos uma letra ou um número.")
        @Size(max = 120, message = "O nome pode ter no máximo 120 caracteres.")
        String nome,
    @Schema(
            description =
                "CPF ou CNPJ, com ou sem pontuação; o CNPJ alfanumérico tem letras nos 12 primeiros"
                    + " caracteres",
            example = "123.456.789-09")
        @Size(max = 20, message = "CPF ou CNPJ pode ter no máximo 20 caracteres.")
        @CpfCnpjValido
        String cpfCnpj,
    @Schema(description = "E-mail de contato", example = "ricardo@exemplo.com.br")
        @Email(regexp = FormatoDeEmail.EXPRESSAO, message = FormatoDeEmail.MENSAGEM)
        @Size(max = 180, message = "O e-mail pode ter no máximo 180 caracteres.")
        String email,
    @Schema(description = "Telefone de contato", example = "+55 11 98888-0000")
        @Pattern(regexp = FormatoDeTelefone.EXPRESSAO, message = FormatoDeTelefone.MENSAGEM)
        @Size(max = 20, message = "O telefone pode ter no máximo 20 caracteres.")
        String telefone,
    @Schema(description = "Cor de identificação na interface", example = "PETROLEO")
        @NotNull(message = "Escolha a cor de identificação.")
        CorDeIdentificacao corDeIdentificacao) {

  /**
   * Documento, e-mail e telefone são opcionais: em branco é ausência, e não um valor a conferir —
   * senão o formato do telefone recusaria o campo vazio que a tela manda.
   */
  public ProprietarioRequest {
    cpfCnpj = ausenteSeEmBranco(cpfCnpj);
    email = ausenteSeEmBranco(email);
    telefone = ausenteSeEmBranco(telefone);
  }

  private static String ausenteSeEmBranco(String texto) {
    return texto == null || texto.isBlank() ? null : texto;
  }
}
