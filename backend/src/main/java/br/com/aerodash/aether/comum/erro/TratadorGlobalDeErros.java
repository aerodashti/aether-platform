package br.com.aerodash.aether.comum.erro;

import static net.logstash.logback.argument.StructuredArguments.kv;

import br.com.aerodash.aether.comum.log.FiltroDeCorrelacao;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Ponto único de tradução de exceção para resposta HTTP, no formato RFC 9457 Problem Details. */
@RestControllerAdvice
public class TratadorGlobalDeErros {

  private static final Logger log = LoggerFactory.getLogger(TratadorGlobalDeErros.class);
  private static final String PROPRIEDADE_REQUISICAO = "requisicao";

  @ExceptionHandler(ExcecaoDeDominio.class)
  public ProblemDetail tratarExcecaoDeDominio(ExcecaoDeDominio excecao) {
    log.warn(
        "Regra de negócio recusou a requisição",
        kv("titulo", excecao.getTitulo()),
        kv("status", excecao.getStatus().value()));
    return montar(excecao.getStatus(), excecao.getTitulo(), excecao.getMessage());
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ProblemDetail tratarEntradaInvalida(MethodArgumentNotValidException excecao) {
    Map<String, String> campos = new LinkedHashMap<>();
    for (FieldError erro : excecao.getBindingResult().getFieldErrors()) {
      campos.put(erro.getField(), erro.getDefaultMessage());
    }
    ProblemDetail problema =
        montar(
            HttpStatus.BAD_REQUEST,
            "Dados inválidos",
            "Verifique os campos informados e tente novamente.");
    problema.setProperty("campos", campos);
    return problema;
  }

  @ExceptionHandler(Exception.class)
  public ProblemDetail tratarFalhaInesperada(Exception excecao) {
    log.error("Falha inesperada ao processar a requisição", excecao);
    return montar(
        HttpStatus.INTERNAL_SERVER_ERROR,
        "Erro interno",
        "Não foi possível concluir a operação. Tente novamente em instantes.");
  }

  private ProblemDetail montar(HttpStatus status, String titulo, String detalhe) {
    ProblemDetail problema = ProblemDetail.forStatus(status);
    problema.setTitle(titulo);
    problema.setDetail(detalhe);
    problema.setProperty(PROPRIEDADE_REQUISICAO, MDC.get(FiltroDeCorrelacao.CHAVE_MDC));
    return problema;
  }
}
