package br.com.aerodash.aether.troca;

import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
import org.springframework.http.HttpStatus;

/**
 * A troca não fecha: o mesmo proprietário dos dois lados, alguém fora do contrato ou uma data fora
 * do lugar. A recusa nomeia o campo do request a que se refere, para a tela marcá-lo.
 */
public class TrocaInvalidaException extends ExcecaoDeDominio {

  private static final long serialVersionUID = 1L;

  public TrocaInvalidaException(String detalhe, String campo) {
    super("Troca inválida", detalhe, campo);
  }

  @Override
  public HttpStatus getStatus() {
    return HttpStatus.BAD_REQUEST;
  }
}
