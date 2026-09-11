package br.com.aerodash.aether.custo;

import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
import org.springframework.http.HttpStatus;

/** O lançamento não fecha: USD sem câmbio ou atribuição a proprietário inativo, por exemplo. */
public class CustoInvalidoException extends ExcecaoDeDominio {

  private static final long serialVersionUID = 1L;

  public CustoInvalidoException(String detalhe) {
    super("Lançamento inválido", detalhe);
  }

  @Override
  public HttpStatus getStatus() {
    return HttpStatus.BAD_REQUEST;
  }
}
