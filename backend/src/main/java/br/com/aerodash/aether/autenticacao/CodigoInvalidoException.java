package br.com.aerodash.aether.autenticacao;

import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
import org.springframework.http.HttpStatus;

/**
 * Código de recuperação errado, expirado, já usado ou com as tentativas esgotadas.
 *
 * <p>A recusa é do campo {@code codigo}, para a tela marcá-lo. A mensagem não manda pedir outro
 * código de cara: um palpite errado só gasta uma das tentativas, e o mesmo código ainda serve.
 */
public class CodigoInvalidoException extends ExcecaoDeDominio {

  private static final long serialVersionUID = 1L;

  private static final String TITULO = "Código inválido";
  private static final String DETALHE =
      "Código incorreto ou expirado. Confira os dígitos ou peça um novo.";

  public CodigoInvalidoException() {
    this("codigo");
  }

  /** Para a tela que tem o campo do código: a recusa cai nele, e não junto dos botões. */
  public CodigoInvalidoException(String campo) {
    super(TITULO, DETALHE, campo);
  }

  @Override
  public HttpStatus getStatus() {
    return HttpStatus.BAD_REQUEST;
  }
}
