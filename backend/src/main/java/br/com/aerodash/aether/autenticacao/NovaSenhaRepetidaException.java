package br.com.aerodash.aether.autenticacao;

import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
import org.springframework.http.HttpStatus;

/** A nova senha é a mesma de agora: a troca gastaria o código sem mudar nada. */
public class NovaSenhaRepetidaException extends ExcecaoDeDominio {

  private static final long serialVersionUID = 1L;

  public NovaSenhaRepetidaException() {
    super("Senha repetida", "A nova senha precisa ser diferente da atual.", "novaSenha");
  }

  @Override
  public HttpStatus getStatus() {
    return HttpStatus.BAD_REQUEST;
  }
}
