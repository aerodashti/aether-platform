package br.com.aerodash.aether.autenticacao;

import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
import org.springframework.http.HttpStatus;

/**
 * Tentativas de entrada demais na mesma conta: o acesso fica suspenso por um tempo.
 *
 * <p>Responder isto em vez de repetir "e-mail ou senha incorretos" revela que o endereço existe,
 * mas só para quem já errou a senha dele várias vezes. A alternativa — silenciar o bloqueio —
 * deixaria a pessoa legítima diante de um erro que não muda por mais que ela acerte a senha. A
 * troca está registrada em {@code docs/adr/0013-sessao-opaca.md}.
 *
 * <p>A mensagem diz quanto falta ({@link Usuario#minutosAteODesbloqueio}): "aguarde alguns minutos"
 * deixa a pessoa tentando de novo a cada um, e cada tentativa dentro da janela é uma recusa a mais.
 */
public class AcessoBloqueadoException extends ExcecaoDeDominio {

  private static final long serialVersionUID = 1L;

  public AcessoBloqueadoException(long minutos) {
    super(
        "Acesso temporariamente bloqueado",
        "Tentativas demais em sequência. Tente de novo em " + emTexto(minutos) + ".");
  }

  /** "1 minuto" ou "N minutos" — o mesmo texto na entrada e na troca de senha. */
  static String emTexto(long minutos) {
    return minutos == 1 ? "1 minuto" : minutos + " minutos";
  }

  @Override
  public HttpStatus getStatus() {
    return HttpStatus.TOO_MANY_REQUESTS;
  }
}
