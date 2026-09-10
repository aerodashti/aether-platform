package br.com.aerodash.aether.aeronave;

import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
import org.springframework.http.HttpStatus;

/** A configuração pedida não existe no produto — periodicidade fora da tabela, por exemplo. */
public class ConfiguracaoFinanceiraInvalidaException extends ExcecaoDeDominio {

  private static final long serialVersionUID = 1L;

  public ConfiguracaoFinanceiraInvalidaException(String detalhe) {
    super("Configuração financeira inválida", detalhe);
  }

  @Override
  public HttpStatus getStatus() {
    return HttpStatus.BAD_REQUEST;
  }
}
