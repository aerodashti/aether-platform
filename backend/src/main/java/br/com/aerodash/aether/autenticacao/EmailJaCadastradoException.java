package br.com.aerodash.aether.autenticacao;

import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
import org.springframework.http.HttpStatus;

/**
 * Já existe alguém com este e-mail.
 *
 * <p>Diferente da área não logada, aqui dizer a verdade é o certo: quem convida é administrador e
 * já pode ver a lista inteira de usuários. Esconder o motivo só faria a pessoa tentar de novo.
 */
public class EmailJaCadastradoException extends ExcecaoDeDominio {

  private static final long serialVersionUID = 1L;

  public EmailJaCadastradoException() {
    super("E-mail já cadastrado", "Já existe um usuário com este e-mail.");
  }

  @Override
  public HttpStatus getStatus() {
    return HttpStatus.CONFLICT;
  }
}
