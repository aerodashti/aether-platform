package br.com.aerodash.aether.aeronave;

import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
import org.springframework.http.HttpStatus;

/** A ficha pedida não fecha consigo mesma — peso de pouso acima do de decolagem, por exemplo. */
public class FichaTecnicaInvalidaException extends ExcecaoDeDominio {

  private static final long serialVersionUID = 1L;

  public FichaTecnicaInvalidaException(String detalhe, String campo) {
    super("Ficha técnica inválida", detalhe, campo);
  }

  @Override
  public HttpStatus getStatus() {
    return HttpStatus.BAD_REQUEST;
  }
}
