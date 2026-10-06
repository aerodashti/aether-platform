package br.com.aerodash.aether.troca;

import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
import org.springframework.http.HttpStatus;

/** A troca não fecha: o mesmo proprietário dos dois lados, ou alguém fora do contrato. */
public class TrocaInvalidaException extends ExcecaoDeDominio {

  private static final long serialVersionUID = 1L;

  public TrocaInvalidaException(String detalhe) {
    super("Troca inválida", detalhe);
  }

  @Override
  public HttpStatus getStatus() {
    return HttpStatus.BAD_REQUEST;
  }
}
