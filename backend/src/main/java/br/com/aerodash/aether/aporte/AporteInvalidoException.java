package br.com.aerodash.aether.aporte;

import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
import org.springframework.http.HttpStatus;

/** A entrada no fundo não fecha: data futura ou proprietário fora do contrato, por exemplo. */
public class AporteInvalidoException extends ExcecaoDeDominio {

  private static final long serialVersionUID = 1L;

  public AporteInvalidoException(String titulo, String detalhe) {
    super(titulo, detalhe);
  }

  @Override
  public HttpStatus getStatus() {
    return HttpStatus.BAD_REQUEST;
  }
}
