package br.com.aerodash.aether.empresa;

import br.com.aerodash.aether.autenticacao.FormatoDeEmail;
import br.com.aerodash.aether.autenticacao.FormatoDeNome;
import br.com.aerodash.aether.comum.validacao.FormatoDeTelefone;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Os dados de contato da empresa.
 *
 * <p>Sem CNPJ: ele é o documento do contrato e a tela o mostra bloqueado. Aceitá-lo aqui, mesmo
 * ignorando, convidaria alguém a tentar.
 *
 * <p>Os textos chegam sem os espaços das pontas, antes da validação: "Administra Air " seria
 * gravado assim e apareceria desalinhado na interface inteira.
 */
@Schema(description = "Alteração dos dados da empresa")
public record AlterarEmpresaRequest(
    @NotBlank(message = "Informe o nome fantasia.")
        @Size(max = 120, message = "O nome fantasia deve ter no máximo 120 caracteres.")
        @Pattern(regexp = FormatoDeNome.EXPRESSAO, message = FormatoDeNome.MENSAGEM)
        String nomeFantasia,
    @NotBlank(message = "Informe a razão social.")
        @Size(max = 180, message = "A razão social deve ter no máximo 180 caracteres.")
        @Pattern(regexp = FormatoDeNome.EXPRESSAO, message = FormatoDeNome.MENSAGEM)
        String razaoSocial,
    @NotBlank(message = "Informe o e-mail.")
        @Email(regexp = FormatoDeEmail.EXPRESSAO, message = FormatoDeEmail.MENSAGEM)
        @Size(max = 180, message = "O e-mail deve ter no máximo 180 caracteres.")
        String email,
    @NotBlank(message = "Informe o telefone.")
        @Size(max = 20, message = "O telefone deve ter no máximo 20 caracteres.")
        @Pattern(regexp = FormatoDeTelefone.EXPRESSAO, message = FormatoDeTelefone.MENSAGEM)
        @Schema(example = "+55 11 3000-0000")
        String telefone) {

  public AlterarEmpresaRequest {
    nomeFantasia = semEspacosNasPontas(nomeFantasia);
    razaoSocial = semEspacosNasPontas(razaoSocial);
    email = semEspacosNasPontas(email);
    telefone = semEspacosNasPontas(telefone);
  }

  private static String semEspacosNasPontas(String texto) {
    return texto == null ? null : texto.strip();
  }
}
