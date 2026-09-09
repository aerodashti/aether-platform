package br.com.aerodash.aether.autenticacao;

import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
import org.springframework.http.HttpStatus;

/**
 * E-mail desconhecido, senha errada, usuário inativo ou convite ainda não concluído.
 *
 * <p>É uma exceção só para os quatro casos, com a mesma mensagem, de propósito: distinguir "esse
 * e-mail não existe" de "a senha está errada" entrega a lista de quem tem conta a quem perguntar.
 */
public class CredenciaisInvalidasException extends ExcecaoDeDominio {

  private static final long serialVersionUID = 1L;

  public CredenciaisInvalidasException() {
    super("Não foi possível entrar", "E-mail ou senha incorretos.");
  }

  @Override
  public HttpStatus getStatus() {
    return HttpStatus.UNAUTHORIZED;
  }
}
