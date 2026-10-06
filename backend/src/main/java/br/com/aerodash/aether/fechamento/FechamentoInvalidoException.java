package br.com.aerodash.aether.fechamento;

import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
import org.springframework.http.HttpStatus;

/** O recorte pedido não fecha: período invertido, por exemplo. */
public class FechamentoInvalidoException extends ExcecaoDeDominio {

  private static final long serialVersionUID = 1L;

  public FechamentoInvalidoException(String detalhe) {
    super("Fechamento inválido", detalhe);
  }

  @Override
  public HttpStatus getStatus() {
    return HttpStatus.BAD_REQUEST;
  }
}
