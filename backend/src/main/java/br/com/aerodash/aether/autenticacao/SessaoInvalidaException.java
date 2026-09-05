package br.com.aerodash.aether.autenticacao;

import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
import org.springframework.http.HttpStatus;

/** Não veio cookie de sessão, ou a sessão dele já foi encerrada ou expirou. */
public class SessaoInvalidaException extends ExcecaoDeDominio {

  private static final long serialVersionUID = 1L;

  public SessaoInvalidaException() {
    super("Sessão encerrada", "Sua sessão expirou. Entre novamente para continuar.");
  }

  @Override
  public HttpStatus getStatus() {
    return HttpStatus.UNAUTHORIZED;
  }
}
