package br.com.aerodash.aether.autenticacao;

import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
import org.springframework.http.HttpStatus;

/**
 * A senha atual informada não confere.
 *
 * <p>Aqui dizer a verdade é o certo, ao contrário da tela de entrada: quem chama já está logado, e
 * portanto já provou quem é. Esconder o motivo só faria a pessoa duvidar da senha nova.
 */
public class SenhaAtualIncorretaException extends ExcecaoDeDominio {

  private static final long serialVersionUID = 1L;

  public SenhaAtualIncorretaException() {
    super("Senha atual incorreta", "A senha atual não confere.");
  }

  @Override
  public HttpStatus getStatus() {
    return HttpStatus.BAD_REQUEST;
  }
}
