package br.com.aerodash.aether.autenticacao;

import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
import java.time.Duration;
import org.springframework.http.HttpStatus;

/**
 * Senha atual errada vezes demais: a troca fica suspensa pelo mesmo tempo que a entrada.
 *
 * <p>Sem isto, quem encontra a estação destravada adivinharia a senha pela troca, sem limite, e
 * contornaria o bloqueio da tela de entrada. A contagem é a mesma das duas portas.
 */
public class TrocaDeSenhaBloqueadaException extends ExcecaoDeDominio {

  private static final long serialVersionUID = 1L;

  public TrocaDeSenhaBloqueadaException(Duration restante) {
    super(
        "Troca de senha bloqueada",
        "Tentativas demais com a senha atual. Tente de novo em %s.".formatted(emMinutos(restante)));
  }

  /** Arredonda para cima: "em 0 minutos" diria que já pode, e ainda não pode. */
  private static String emMinutos(Duration restante) {
    long minutos = Math.max(1, (restante.toSeconds() + 59) / 60);
    return minutos == 1 ? "1 minuto" : minutos + " minutos";
  }

  @Override
  public HttpStatus getStatus() {
    return HttpStatus.TOO_MANY_REQUESTS;
  }
}
