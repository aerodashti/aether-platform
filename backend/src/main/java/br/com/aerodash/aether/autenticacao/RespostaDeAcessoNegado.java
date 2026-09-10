package br.com.aerodash.aether.autenticacao;

import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import br.com.aerodash.aether.comum.observabilidade.FiltroDeLinhaCanonica;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

/**
 * As recusas da cadeia de autorização, no mesmo formato das recusas de negócio.
 *
 * <p>Elas não passam pelo {@code TratadorGlobalDeErros}: a cadeia de filtros do Spring Security
 * corta antes de qualquer controller, então o {@code @RestControllerAdvice} nunca é alcançado. Sem
 * esta classe o front receberia uma página de erro do container em 401 e 403 — e teria dois
 * formatos de erro para tratar.
 *
 * <p>A distinção entre os dois códigos é deliberada: 401 diz "entre"; 403 diz "você entrou, mas
 * isto não é seu". Responder 401 para os dois mandaria de volta ao login alguém que já está logado.
 */
@Component
public class RespostaDeAcessoNegado implements AuthenticationEntryPoint, AccessDeniedHandler {

  private static final String PROPRIEDADE_REQUISICAO = "requisicao";

  private final ObjectMapper json;
  private final ContextoDaRequisicao contexto;

  public RespostaDeAcessoNegado(ObjectMapper json, ContextoDaRequisicao contexto) {
    this.json = json;
    this.contexto = contexto;
  }

  @Override
  public void commence(
      HttpServletRequest requisicao, HttpServletResponse resposta, AuthenticationException excecao)
      throws IOException {
    escrever(
        resposta,
        excecao,
        HttpStatus.UNAUTHORIZED,
        "Sessão encerrada",
        "Sua sessão expirou. Entre novamente para continuar.");
  }

  @Override
  public void handle(
      HttpServletRequest requisicao, HttpServletResponse resposta, AccessDeniedException excecao)
      throws IOException {
    escrever(
        resposta,
        excecao,
        HttpStatus.FORBIDDEN,
        "Acesso restrito",
        "Esta área é exclusiva de administradores.");
  }

  private void escrever(
      HttpServletResponse resposta,
      Exception excecao,
      HttpStatus status,
      String titulo,
      String detalhe)
      throws IOException {
    contexto.registrarErro(excecao);
    ProblemDetail problema = ProblemDetail.forStatus(status);
    problema.setTitle(titulo);
    problema.setDetail(detalhe);
    problema.setProperty(PROPRIEDADE_REQUISICAO, MDC.get(FiltroDeLinhaCanonica.CHAVE_MDC));
    resposta.setStatus(status.value());
    resposta.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
    resposta.setCharacterEncoding("UTF-8");
    json.writeValue(resposta.getOutputStream(), problema);
  }
}
