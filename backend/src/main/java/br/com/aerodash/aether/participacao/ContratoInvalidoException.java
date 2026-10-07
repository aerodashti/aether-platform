package br.com.aerodash.aether.participacao;

import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
import org.springframework.http.HttpStatus;

/**
 * O contrato pedido não fecha: soma diferente de 100, proprietário repetido, inativo ou ausente.
 */
public class ContratoInvalidoException extends ExcecaoDeDominio {

  private static final long serialVersionUID = 1L;

  private static final String TITULO = "Contrato de participação inválido";

  public ContratoInvalidoException(String detalhe) {
    super(TITULO, detalhe);
  }

  /**
   * @param campo o caminho no JSON do pedido — {@code participacoes[1].proprietarioId}, ou {@code
   *     contratos[0].participacoes} na saída —, para a tela marcar a linha certa.
   */
  public ContratoInvalidoException(String detalhe, String campo) {
    super(TITULO, detalhe, campo);
  }

  @Override
  public HttpStatus getStatus() {
    return HttpStatus.BAD_REQUEST;
  }
}
