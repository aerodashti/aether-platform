package br.com.aerodash.aether.autenticacao;

import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
import org.springframework.http.HttpStatus;

/**
 * A senha nova é a mesma de agora — ao redefinir pelo código ou ao trocar a própria senha.
 *
 * <p>Redefinir é o que a pessoa faz quando desconfia da senha; aceitar a mesma deixaria a conta
 * exatamente como estava, com a impressão de que algo mudou. Na troca, gastaria o código sem mudar
 * nada.
 */
public class SenhaRepetidaException extends ExcecaoDeDominio {

  private static final long serialVersionUID = 1L;

  public SenhaRepetidaException() {
    super("Senha repetida", "A nova senha precisa ser diferente da atual.", "novaSenha");
  }

  @Override
  public HttpStatus getStatus() {
    return HttpStatus.BAD_REQUEST;
  }
}
