package br.com.aerodash.aether.autenticacao;

import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
import org.springframework.http.HttpStatus;

/** Código de recuperação errado, expirado, já usado ou com as tentativas esgotadas. */
public class CodigoInvalidoException extends ExcecaoDeDominio {

  private static final long serialVersionUID = 1L;

  public CodigoInvalidoException() {
    super("Código inválido", "Código inválido ou expirado. Peça um novo para continuar.");
  }

  @Override
  public HttpStatus getStatus() {
    return HttpStatus.BAD_REQUEST;
  }
}
