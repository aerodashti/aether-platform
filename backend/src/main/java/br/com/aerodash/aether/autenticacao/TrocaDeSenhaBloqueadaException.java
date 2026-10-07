package br.com.aerodash.aether.autenticacao;

import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
import org.springframework.http.HttpStatus;

/**
 * Senha atual errada vezes demais: a troca fica suspensa pelo mesmo tempo que a entrada.
 *
 * <p>Sem isto, quem encontra a estação destravada adivinharia a senha pela troca, sem limite, e
 * contornaria o bloqueio da tela de entrada. A contagem é a mesma das duas portas.
 */
public class TrocaDeSenhaBloqueadaException extends ExcecaoDeDominio {

  private static final long serialVersionUID = 1L;

  public TrocaDeSenhaBloqueadaException(long minutos) {
    super(
        "Troca de senha bloqueada",
        "A conta está bloqueada por tentativas erradas de senha. Tente de novo em %s."
            .formatted(AcessoBloqueadoException.emTexto(minutos)));
  }

  @Override
  public HttpStatus getStatus() {
    return HttpStatus.TOO_MANY_REQUESTS;
  }
}
