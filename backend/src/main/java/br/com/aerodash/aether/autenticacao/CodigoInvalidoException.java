package br.com.aerodash.aether.autenticacao;

import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
import org.springframework.http.HttpStatus;

/** Código de recuperação errado, expirado, já usado ou com as tentativas esgotadas. */
public class CodigoInvalidoException extends ExcecaoDeDominio {

  private static final long serialVersionUID = 1L;

  private static final String TITULO = "Código inválido";
  private static final String DETALHE = "Código inválido ou expirado. Peça um novo para continuar.";

  public CodigoInvalidoException() {
    super(TITULO, DETALHE);
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
