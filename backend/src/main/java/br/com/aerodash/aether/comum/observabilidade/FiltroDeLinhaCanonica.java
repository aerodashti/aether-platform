package br.com.aerodash.aether.comum.observabilidade;

import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao.Estado;
import io.opentelemetry.api.OpenTelemetry;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.SpanKind;
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.context.Context;
import io.opentelemetry.context.Scope;
import io.opentelemetry.context.propagation.TextMapGetter;
import io.opentelemetry.context.propagation.TextMapPropagator;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import net.logstash.logback.argument.StructuredArguments;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.HandlerMapping;
import org.springframework.web.util.ContentCachingRequestWrapper;
import org.springframework.web.util.ContentCachingResponseWrapper;

/**
 * Emite <b>uma</b> linha de log por request, com tudo que é preciso para investigar aquele request
 * sem procurar outras linhas — o padrão canonical log line.
 *
 * <p>O filtro é dono do span de servidor: ele extrai o contexto remoto do {@code traceparent}, abre
 * o span, e só o encerra depois de escrever a linha. É isso que garante que a linha canônica, o
 * ERROR do tratador de erros e o span exportado carreguem o mesmo {@code trace_id}.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class FiltroDeLinhaCanonica extends OncePerRequestFilter {

  public static final String HEADER = "X-Request-Id";
  public static final String CHAVE_MDC = "requestId";

  private static final Logger log = LoggerFactory.getLogger(FiltroDeLinhaCanonica.class);
  private static final Set<String> CAMINHOS_DE_INFRAESTRUTURA =
      Set.of("/actuator", "/swagger-ui", "/v3/api-docs", "/favicon.ico");

  private static final TextMapGetter<HttpServletRequest> LEITOR_DE_HEADERS =
      new TextMapGetter<>() {
        @Override
        public Iterable<String> keys(HttpServletRequest requisicao) {
          return Collections.list(requisicao.getHeaderNames());
        }

        @Override
        public String get(HttpServletRequest requisicao, String chave) {
          return requisicao == null ? null : requisicao.getHeader(chave);
        }
      };

  private final Tracer tracer;
  private final TextMapPropagator propagador;
  private final SanitizadorDeLog sanitizador;

  public FiltroDeLinhaCanonica(OpenTelemetry openTelemetry, SanitizadorDeLog sanitizador) {
    this.tracer = openTelemetry.getTracer("br.com.aerodash.aether");
    this.propagador = openTelemetry.getPropagators().getTextMapPropagator();
    this.sanitizador = sanitizador;
  }

  @Override
  protected boolean shouldNotFilter(HttpServletRequest requisicao) {
    String caminho = requisicao.getRequestURI();
    return CAMINHOS_DE_INFRAESTRUTURA.stream().anyMatch(caminho::startsWith);
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest requisicao, HttpServletResponse resposta, FilterChain cadeia)
      throws ServletException, IOException {
    String identificador = identificador(requisicao);
    resposta.setHeader(HEADER, identificador);
    MDC.put(CHAVE_MDC, identificador);

    HttpServletRequest entrada = envolverEntrada(requisicao);
    ContentCachingResponseWrapper saida = new ContentCachingResponseWrapper(resposta);
    Estado estado = new Estado();

    Context remoto = propagador.extract(Context.current(), requisicao, LEITOR_DE_HEADERS);
    Span span =
        tracer
            .spanBuilder(requisicao.getMethod())
            .setSpanKind(SpanKind.SERVER)
            .setParent(remoto)
            .startSpan();
    long inicio = System.nanoTime();

    try (Scope escopo = remoto.with(span).with(ContextoDaRequisicao.CHAVE, estado).makeCurrent()) {
      try {
        cadeia.doFilter(entrada, saida);
      } finally {
        concluir(entrada, saida, estado, span, inicio);
      }
    } finally {
      span.end();
      saida.copyBodyToResponse();
      MDC.remove(CHAVE_MDC);
    }
  }

  /** Multipart e binário nunca são bufferizados: a política proíbe processar esse conteúdo. */
  private static HttpServletRequest envolverEntrada(HttpServletRequest requisicao) {
    String tipo = requisicao.getContentType();
    if (tipo != null && tipo.toLowerCase(java.util.Locale.ROOT).startsWith("multipart/")) {
      return requisicao;
    }
    return new ContentCachingRequestWrapper(requisicao);
  }

  private static String identificador(HttpServletRequest requisicao) {
    String recebido = requisicao.getHeader(HEADER);
    return StringUtils.hasText(recebido) ? recebido : UUID.randomUUID().toString();
  }

  private void concluir(
      HttpServletRequest entrada,
      ContentCachingResponseWrapper saida,
      Estado estado,
      Span span,
      long inicio) {
    String rota = rota(entrada);
    span.updateName(entrada.getMethod() + " " + rota);
    Map<String, Object> campos = montarCampos(entrada, saida, estado, rota, duracaoMs(inicio));
    campos.forEach((chave, valor) -> ContextoDaRequisicao.aplicarNoSpan(span, chave, valor));
    log.info("requisicao {}", StructuredArguments.entries(campos));
  }

  private static long duracaoMs(long inicio) {
    return TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - inicio);
  }

  private Map<String, Object> montarCampos(
      HttpServletRequest entrada,
      ContentCachingResponseWrapper saida,
      Estado estado,
      String rota,
      long duracaoMs) {
    Map<String, Object> campos = new LinkedHashMap<>();
    campos.put("http.metodo", entrada.getMethod());
    campos.put("http.rota", rota);
    campos.put("http.status", saida.getStatus());
    campos.put("duracao_ms", duracaoMs);
    if (entrada.getUserPrincipal() != null) {
      campos.put("usuario.id", entrada.getUserPrincipal().getName());
    }
    acrescentar(campos, "request.body", corpoDaEntrada(entrada));
    acrescentar(
        campos,
        "response.body",
        sanitizador.sanitizarCorpo(saida.getContentAsByteArray(), saida.getContentType()));
    campos.putAll(estado.atributos());
    campos.put("erro", estado.possuiErro());
    acrescentar(campos, ContextoDaRequisicao.CAMPO_ERRO_CLASSE, estado.classeDoErro());
    return campos;
  }

  private Object corpoDaEntrada(HttpServletRequest entrada) {
    if (entrada instanceof ContentCachingRequestWrapper bufferizada) {
      return sanitizador.sanitizarCorpo(
          bufferizada.getContentAsByteArray(), bufferizada.getContentType());
    }
    return Map.of(
        "content_type", String.valueOf(entrada.getContentType()),
        "tamanho_bytes", entrada.getContentLengthLong());
  }

  private static void acrescentar(Map<String, Object> campos, String chave, Object valor) {
    if (valor != null && !(valor instanceof List<?> lista && lista.isEmpty())) {
      campos.put(chave, valor);
    }
  }

  private static String rota(HttpServletRequest entrada) {
    Object padrao = entrada.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE);
    return padrao == null ? entrada.getRequestURI() : String.valueOf(padrao);
  }
}
