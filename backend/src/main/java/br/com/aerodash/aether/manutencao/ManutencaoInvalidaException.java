package br.com.aerodash.aether.manutencao;

import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
import org.springframework.http.HttpStatus;

/** O pedido não fecha: parâmetro DATA sem data limite, por exemplo. */
public class ManutencaoInvalidaException extends ExcecaoDeDominio {

  private static final long serialVersionUID = 1L;

  public ManutencaoInvalidaException(String detalhe) {
    super("Manutenção inválida", detalhe);
  }

  @Override
  public HttpStatus getStatus() {
    return HttpStatus.BAD_REQUEST;
  }
}
