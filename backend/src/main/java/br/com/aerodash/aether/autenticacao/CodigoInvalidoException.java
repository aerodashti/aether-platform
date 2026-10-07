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

  public CodigoInvalidoException() {
    super(
        "Código inválido",
        "Código incorreto ou expirado. Confira os dígitos ou peça um novo.",
        "codigo");
  }

  @Override
  public HttpStatus getStatus() {
    return HttpStatus.BAD_REQUEST;
  }
}
