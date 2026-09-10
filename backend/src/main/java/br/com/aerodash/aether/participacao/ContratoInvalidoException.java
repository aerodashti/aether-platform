package br.com.aerodash.aether.participacao;

import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
import org.springframework.http.HttpStatus;

/** O contrato pedido não fecha: soma diferente de 100, proprietário repetido ou desconhecido. */
public class ContratoInvalidoException extends ExcecaoDeDominio {

  private static final long serialVersionUID = 1L;

  public ContratoInvalidoException(String detalhe) {
    super("Contrato de participação inválido", detalhe);
  }

  @Override
  public HttpStatus getStatus() {
    return HttpStatus.BAD_REQUEST;
  }
}
