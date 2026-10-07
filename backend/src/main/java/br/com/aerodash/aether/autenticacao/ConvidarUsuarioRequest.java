package br.com.aerodash.aether.autenticacao;

import br.com.aerodash.aether.comum.validacao.FormatoDeEmail;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * O que o administrador informa para dar acesso a alguém.
 *
 * <p>Não há campo de senha, e a ausência é a regra: quem cria a senha é a própria pessoa, pelo link
 * do convite. Ver {@code docs/glossario.md}.
 *
 * <p>Nome e e-mail chegam sem os espaços das pontas, antes da validação: um nome colado com espaço
 * no fim seria gravado assim e desalinharia a ordem da lista.
 */
@Schema(description = "Convite de acesso ao Aether")
public record ConvidarUsuarioRequest(
    @NotBlank(message = "Informe o nome.")
        @Size(max = 120, message = "O nome deve ter no máximo 120 caracteres.")
        @Pattern(regexp = FormatoDeNome.EXPRESSAO, message = FormatoDeNome.MENSAGEM)
        @Schema(description = "Nome de exibição", example = "Camila Nogueira")
        String nome,
    @NotBlank(message = "Informe o e-mail.")
        @Email(regexp = FormatoDeEmail.EXPRESSAO, message = FormatoDeEmail.MENSAGEM)
        @Size(max = 180, message = "O e-mail deve ter no máximo 180 caracteres.")
        @Schema(description = "E-mail de acesso", example = "camila@administraair.com.br")
        String email,
    @NotNull(message = "Escolha o papel.")
        @Schema(description = "O que a pessoa será no Aether", example = "GESTOR")
        PapelDoUsuario papel) {

  public ConvidarUsuarioRequest {
    nome = nome == null ? null : nome.strip();
    email = email == null ? null : email.strip();
  }
}
