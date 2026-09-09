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
 */
public class AcessoBloqueadoException extends ExcecaoDeDominio {

  private static final long serialVersionUID = 1L;

  public AcessoBloqueadoException() {
    super(
        "Acesso temporariamente bloqueado",
        "Tentativas demais em sequência. Aguarde alguns minutos antes de tentar de novo.");
  }

  @Override
  public HttpStatus getStatus() {
    return HttpStatus.TOO_MANY_REQUESTS;
  }
}
