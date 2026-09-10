package br.com.aerodash.aether.proprietario;

import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
import org.springframework.http.HttpStatus;

/**
 * Já existe um proprietário com este documento.
 *
 * <p>Dizer a verdade é o certo aqui: quem cadastra proprietários já vê a lista inteira, e o
 * documento duplicado quase sempre significa que a pessoa já está cadastrada com outro nome.
 */
public class CpfCnpjJaCadastradoException extends ExcecaoDeDominio {

  private static final long serialVersionUID = 1L;

  public CpfCnpjJaCadastradoException() {
    super("CPF ou CNPJ já cadastrado", "Já existe um proprietário com este documento.");
  }

  @Override
  public HttpStatus getStatus() {
    return HttpStatus.CONFLICT;
  }
}
