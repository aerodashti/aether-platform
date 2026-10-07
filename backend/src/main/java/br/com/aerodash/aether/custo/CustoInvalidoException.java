package br.com.aerodash.aether.custo;

import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
import org.springframework.http.HttpStatus;

/**
 * O lançamento não fecha: USD sem câmbio ou atribuição a proprietário inativo, por exemplo. A
 * recusa nomeia o campo do request a que se refere, para a tela marcá-lo.
 */
public class CustoInvalidoException extends ExcecaoDeDominio {

  private static final long serialVersionUID = 1L;

  public CustoInvalidoException(String detalhe, String campo) {
    super("Lançamento inválido", detalhe, campo);
  }

  @Override
  public HttpStatus getStatus() {
    return HttpStatus.BAD_REQUEST;
  }
}
