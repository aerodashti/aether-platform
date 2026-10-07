package br.com.aerodash.aether.aeronave;

import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
import org.springframework.http.HttpStatus;

/** A configuração pedida não existe no produto — periodicidade fora da tabela, por exemplo. */
public class ConfiguracaoFinanceiraInvalidaException extends ExcecaoDeDominio {

  private static final long serialVersionUID = 1L;

  public ConfiguracaoFinanceiraInvalidaException(String detalhe) {
    super("Configuração financeira inválida", detalhe);
  }

  /** A recusa de um campo só, pelo nome dele no JSON — com o prefixo, quando vem aninhado. */
  public ConfiguracaoFinanceiraInvalidaException(String detalhe, String campo) {
    super("Configuração financeira inválida", detalhe, campo);
  }

  @Override
  public HttpStatus getStatus() {
    return HttpStatus.BAD_REQUEST;
  }
}
