package br.com.aerodash.aether.comum.log;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Garante que todo log de um mesmo request compartilhe um identificador. O valor entra no MDC e
 * volta no header da resposta, para que um erro visto na tela possa ser ligado ao log do servidor.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class FiltroDeCorrelacao extends OncePerRequestFilter {

  public static final String HEADER = "X-Request-Id";
  public static final String CHAVE_MDC = "requisicao";

  @Override
  protected void doFilterInternal(
      HttpServletRequest requisicao, HttpServletResponse resposta, FilterChain cadeia)
      throws ServletException, IOException {
    String identificador = requisicao.getHeader(HEADER);
    if (!StringUtils.hasText(identificador)) {
      identificador = UUID.randomUUID().toString();
    }
    MDC.put(CHAVE_MDC, identificador);
    resposta.setHeader(HEADER, identificador);
    try {
      cadeia.doFilter(requisicao, resposta);
    } finally {
      MDC.remove(CHAVE_MDC);
    }
  }
}
