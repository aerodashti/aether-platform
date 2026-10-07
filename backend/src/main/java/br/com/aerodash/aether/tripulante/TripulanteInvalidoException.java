package br.com.aerodash.aether.tripulante;

import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
import org.springframework.http.HttpStatus;

/**
 * Um campo do tripulante não fecha com a regra: uma validade fora da janela plausível, por exemplo.
 */
public class TripulanteInvalidoException extends ExcecaoDeDominio {

  private static final long serialVersionUID = 1L;

  public TripulanteInvalidoException(String campo, String detalhe) {
    super("Tripulante inválido", detalhe, campo);
  }

  @Override
  public HttpStatus getStatus() {
    return HttpStatus.BAD_REQUEST;
  }
}
