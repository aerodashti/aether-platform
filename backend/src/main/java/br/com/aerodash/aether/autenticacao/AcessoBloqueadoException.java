package br.com.aerodash.aether.autenticacao;

import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
import java.time.Duration;
import org.springframework.http.HttpStatus;

/**
 * Tentativas de entrada demais na mesma conta: o acesso fica suspenso por um tempo.
 *
 * <p>Responder isto em vez de repetir "e-mail ou senha incorretos" revela que o endereço existe,
 * mas só para quem já errou a senha dele várias vezes. A alternativa — silenciar o bloqueio —
 * deixaria a pessoa legítima diante de um erro que não muda por mais que ela acerte a senha. A
 * troca está registrada em {@code docs/adr/0013-sessao-opaca.md}.
 *
 * <p>A mensagem diz quanto falta, arredondado para cima: "aguarde alguns minutos" deixa a pessoa
 * tentando de novo a cada um, e cada tentativa dentro da janela é uma recusa a mais.
 */
public class AcessoBloqueadoException extends ExcecaoDeDominio {

  private static final long serialVersionUID = 1L;
  private static final long MILISSEGUNDOS_POR_MINUTO = 60_000;

  public AcessoBloqueadoException(Duration restante) {
    super(
        "Acesso temporariamente bloqueado",
        "Tentativas demais em sequência. Tente de novo em " + emMinutos(restante) + ".");
  }

  private static String emMinutos(Duration restante) {
    long minutos = Math.max(1, Math.ceilDiv(restante.toMillis(), MILISSEGUNDOS_POR_MINUTO));
    return minutos == 1 ? "1 minuto" : minutos + " minutos";
  }

  @Override
  public HttpStatus getStatus() {
    return HttpStatus.TOO_MANY_REQUESTS;
  }
}
