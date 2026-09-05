package br.com.aerodash.aether.comum.erro;

import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import br.com.aerodash.aether.comum.observabilidade.FiltroDeLinhaCanonica;
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

/**
 * Ponto único de tradução de exceção para resposta HTTP, no formato RFC 9457 Problem Details.
 *
 * <p>Toda exceção passa por {@code contexto.registrarErro}, que marca o span e faz a linha canônica
 * sair com {@code erro=true}. Só a falha inesperada gera uma segunda linha, em ERROR e com stack
 * trace: para um 4xx de regra de negócio a linha canônica já diz tudo, e um ERROR por 404 tornaria
 * o nível ERROR inútil.
 */
@RestControllerAdvice
public class TratadorGlobalDeErros {

  private static final Logger log = LoggerFactory.getLogger(TratadorGlobalDeErros.class);
  private static final String PROPRIEDADE_REQUISICAO = "requisicao";

  private final ContextoDaRequisicao contexto;

  public TratadorGlobalDeErros(ContextoDaRequisicao contexto) {
    this.contexto = contexto;
  }

  @ExceptionHandler(ExcecaoDeDominio.class)
  public ProblemDetail tratarExcecaoDeDominio(ExcecaoDeDominio excecao) {
    contexto.registrarErro(excecao);
    return montar(excecao.getStatus(), excecao.getTitulo(), excecao.getMessage());
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ProblemDetail tratarEntradaInvalida(MethodArgumentNotValidException excecao) {
    contexto.registrarErro(excecao);
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
    contexto.registrarErro(excecao);
    log.error(
        "Falha inesperada ao processar a requisição (requestId={})",
        MDC.get(FiltroDeLinhaCanonica.CHAVE_MDC),
        excecao);
    return montar(
        HttpStatus.INTERNAL_SERVER_ERROR,
        "Erro interno",
        "Não foi possível concluir a operação. Tente novamente em instantes.");
  }

  private ProblemDetail montar(HttpStatus status, String titulo, String detalhe) {
    ProblemDetail problema = ProblemDetail.forStatus(status);
    problema.setTitle(titulo);
    problema.setDetail(detalhe);
    problema.setProperty(PROPRIEDADE_REQUISICAO, MDC.get(FiltroDeLinhaCanonica.CHAVE_MDC));
    return problema;
  }
}
