package br.com.aerodash.aether.comum.observabilidade;

import io.opentelemetry.api.common.AttributeKey;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.StatusCode;
import io.opentelemetry.context.Context;
import io.opentelemetry.context.ContextKey;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

/**
 * Única API de observabilidade que o código de negócio usa.
 *
 * <p>O estado vive no {@link Context} do OpenTelemetry, não em um {@code @RequestScope}: é o que
 * faz a propagação entre threads ser responsabilidade do próprio OTel (veja o {@code TaskDecorator}
 * em {@link ConfiguracaoDeObservabilidade}) e o que permite ao {@code FiltroDeLinhaCanonica} rodar
 * antes de qualquer filtro do Spring. Este componente é uma camada fina por cima disso.
 *
 * <p>Fora de um request — em um job, por exemplo — os métodos são no-op no acúmulo e continuam
 * escrevendo no span corrente, se houver.
 */
@Component
public class ContextoDaRequisicao {

  static final String PREFIXO_DECISAO = "decisao.";
  static final String CAMPO_ERRO_CLASSE = "erro.classe";
  static final ContextKey<Estado> CHAVE = ContextKey.named("aether-observacao");

  private final SanitizadorDeLog sanitizador;

  public ContextoDaRequisicao(SanitizadorDeLog sanitizador) {
    this.sanitizador = sanitizador;
  }

  /** Dado relevante do fluxo: identificadores, contagens, resultados. */
  public void registrar(String chave, Object valor) {
    gravar(chave, valor);
  }

  /**
   * Variável que determina um ramo de execução. Chame <b>antes</b> do {@code if}, {@code switch},
   * condição de loop ou early return — é assim que a linha canônica explica o caminho tomado.
   */
  public void decisao(String chave, Object valor) {
    gravar(PREFIXO_DECISAO + chave, valor);
  }

  /** Chamado pelo tratador global de erros; marca o span e a linha canônica. */
  public void registrarErro(Throwable excecao) {
    Estado estado = Context.current().get(CHAVE);
    if (estado != null) {
      estado.erro = true;
      estado.classeDoErro = excecao.getClass().getSimpleName();
    }
    Span span = Span.current();
    span.recordException(excecao);
    span.setStatus(StatusCode.ERROR, excecao.getClass().getSimpleName());
    span.setAttribute(CAMPO_ERRO_CLASSE, excecao.getClass().getSimpleName());
  }

  private void gravar(String chave, Object valor) {
    Object tratado = sanitizador.sanitizar(valor);
    Estado estado = Context.current().get(CHAVE);
    if (estado != null) {
      estado.atributos.put(chave, tratado);
    }
    aplicarNoSpan(Span.current(), chave, tratado);
  }

  static void aplicarNoSpan(Span span, String chave, Object valor) {
    switch (valor) {
      case null -> span.setAttribute(AttributeKey.stringKey(chave), "null");
      case Boolean logico -> span.setAttribute(AttributeKey.booleanKey(chave), logico);
      case Integer inteiro -> span.setAttribute(AttributeKey.longKey(chave), inteiro.longValue());
      case Long longo -> span.setAttribute(AttributeKey.longKey(chave), longo);
      case Number numero -> span.setAttribute(AttributeKey.doubleKey(chave), numero.doubleValue());
      case List<?> lista -> span.setAttribute(AttributeKey.stringArrayKey(chave), comoTexto(lista));
      default -> span.setAttribute(AttributeKey.stringKey(chave), String.valueOf(valor));
    }
  }

  private static List<String> comoTexto(List<?> lista) {
    return lista.stream().map(String::valueOf).toList();
  }

  /** Acumulado de um request. Criado e fechado pelo {@code FiltroDeLinhaCanonica}. */
  static final class Estado {

    private final Map<String, Object> atributos =
        Collections.synchronizedMap(new LinkedHashMap<>());
    private volatile boolean erro;
    private volatile String classeDoErro;

    Map<String, Object> atributos() {
      synchronized (atributos) {
        return new LinkedHashMap<>(atributos);
      }
    }

    boolean possuiErro() {
      return erro;
    }

    String classeDoErro() {
      return classeDoErro;
    }
  }
}
