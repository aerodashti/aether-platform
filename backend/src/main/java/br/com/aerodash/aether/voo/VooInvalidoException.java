package br.com.aerodash.aether.voo;

import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
import org.springframework.http.HttpStatus;

/** O trecho pedido não fecha: atribuição a proprietário inativo, por exemplo. */
public class VooInvalidoException extends ExcecaoDeDominio {

  private static final long serialVersionUID = 1L;

  public VooInvalidoException(String detalhe) {
    super("Trecho inválido", detalhe);
  }

  @Override
  public HttpStatus getStatus() {
    return HttpStatus.BAD_REQUEST;
  }
}
