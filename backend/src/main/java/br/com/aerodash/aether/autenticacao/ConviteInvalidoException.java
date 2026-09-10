package br.com.aerodash.aether.autenticacao;

import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
import org.springframework.http.HttpStatus;

/** Link de convite desconhecido, expirado ou já usado. */
public class ConviteInvalidoException extends ExcecaoDeDominio {

  private static final long serialVersionUID = 1L;

  public ConviteInvalidoException() {
    super(
        "Convite inválido", "Este convite expirou ou já foi usado. Peça um novo ao administrador.");
  }

  @Override
  public HttpStatus getStatus() {
    return HttpStatus.BAD_REQUEST;
  }
}
