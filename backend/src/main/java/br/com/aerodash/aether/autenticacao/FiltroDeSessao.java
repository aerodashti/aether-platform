package br.com.aerodash.aether.autenticacao;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Arrays;
import java.util.Optional;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Traduz o cookie de sessão em identidade autenticada, uma vez por requisição.
 *
 * <p>Até a área logada existir, quem lia o cookie era o próprio serviço, dentro do único endpoint
 * que precisava dele. Com a primeira tela autorizada por papel isso deixou de bastar: a decisão
 * "esta pessoa pode ver isto" tem que valer para toda rota, e não uma vez por controller.
 *
 * <p>O filtro nunca recusa: cookie ausente, inválido ou expirado apenas deixa a requisição seguir
 * anônima. Quem responde 401 ou 403 é a cadeia de autorização, num lugar só.
 */
@Component
public class FiltroDeSessao extends OncePerRequestFilter {

  private final AutenticacaoService autenticacao;

  public FiltroDeSessao(AutenticacaoService autenticacao) {
    this.autenticacao = autenticacao;
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest requisicao, HttpServletResponse resposta, FilterChain corrente)
      throws ServletException, IOException {
    if (SecurityContextHolder.getContext().getAuthentication() == null) {
      token(requisicao).flatMap(autenticacao::autenticar).ifPresent(FiltroDeSessao::firmar);
    }
    corrente.doFilter(requisicao, resposta);
  }

  private static void firmar(UsuarioAutenticado usuario) {
    SecurityContextHolder.getContext()
        .setAuthentication(
            UsernamePasswordAuthenticationToken.authenticated(
                usuario, null, usuario.autoridades()));
  }

  private static Optional<String> token(HttpServletRequest requisicao) {
    Cookie[] cookies = requisicao.getCookies();
    if (cookies == null) {
      return Optional.empty();
    }
    return Arrays.stream(cookies)
        .filter(cookie -> AutenticacaoController.COOKIE_DE_SESSAO.equals(cookie.getName()))
        .map(Cookie::getValue)
        .filter(valor -> valor != null && !valor.isBlank())
        .findFirst();
  }
}
