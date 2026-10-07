package br.com.aerodash.aether.comum.erro;

import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import br.com.aerodash.aether.comum.observabilidade.FiltroDeLinhaCanonica;
import java.sql.SQLException;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpMediaTypeNotAcceptableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.ServletRequestBindingException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

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
  private static final String PROPRIEDADE_CAMPOS = "campos";
  private static final String TITULO_DADOS_INVALIDOS = "Dados inválidos";
  private static final String DETALHE_DADOS_INVALIDOS =
      "Verifique os campos informados e tente novamente.";

  /**
   * Com duas violações no mesmo campo (vazio e curto demais, por exemplo), a que vale é a da falta:
   * "Informe a descrição" diz o que fazer; "tamanho entre 1 e 200" sobre um campo vazio, não.
   */
  private static final Set<String> CODIGOS_DE_FALTA = Set.of("NotNull", "NotBlank", "NotEmpty");

  private static final Comparator<FieldError> FALTA_PRIMEIRO =
      Comparator.comparingInt(erro -> CODIGOS_DE_FALTA.contains(erro.getCode()) ? 0 : 1);

  /** SQLSTATE de violação de unicidade no PostgreSQL. */
  private static final String UNICIDADE_VIOLADA = "23505";

  private final ContextoDaRequisicao contexto;

  public TratadorGlobalDeErros(ContextoDaRequisicao contexto) {
    this.contexto = contexto;
  }

  @ExceptionHandler(ExcecaoDeDominio.class)
  public ProblemDetail tratarExcecaoDeDominio(ExcecaoDeDominio excecao) {
    contexto.registrarErro(excecao);
    ProblemDetail problema = montar(excecao.getStatus(), excecao.getTitulo(), excecao.getMessage());
    excecao
        .getCampo()
        .ifPresent(
            campo -> problema.setProperty(PROPRIEDADE_CAMPOS, Map.of(campo, excecao.getMessage())));
    return problema;
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ProblemDetail tratarEntradaInvalida(MethodArgumentNotValidException excecao) {
    contexto.registrarErro(excecao);
    Map<String, String> campos = new LinkedHashMap<>();
    excecao.getBindingResult().getFieldErrors().stream()
        .sorted(FALTA_PRIMEIRO)
        .forEach(erro -> campos.putIfAbsent(erro.getField(), erro.getDefaultMessage()));
    return dadosInvalidos(campos);
  }

  /**
   * Parâmetro que falta, que não converte ({@code ?competencia=setembro}) ou corpo que não é JSON:
   * é erro de quem chamou, não do servidor. Sem isto cairiam na falha inesperada — 500 e um ERROR
   * com stack trace para cada URL digitada errado.
   */
  @ExceptionHandler({
    MissingServletRequestParameterException.class,
    MethodArgumentTypeMismatchException.class,
    HttpMessageNotReadableException.class
  })
  public ProblemDetail tratarRequisicaoMalformada(Exception excecao) {
    contexto.registrarErro(excecao);
    Map<String, String> campos =
        excecao instanceof HttpMessageNotReadableException ilegivel
            ? LeitorDeCorpoIlegivel.camposRecusados(ilegivel)
            : Map.of();
    contexto.decisao("erro.campoIdentificado", !campos.isEmpty());
    if (!campos.isEmpty()) {
      return dadosInvalidos(campos);
    }
    String detalhe =
        switch (excecao) {
          case MissingServletRequestParameterException falta ->
              "Informe o parâmetro \"" + falta.getParameterName() + "\".";
          case MethodArgumentTypeMismatchException tipo ->
              "O parâmetro \"" + tipo.getName() + "\" não está no formato esperado.";
          default -> "O corpo da requisição não pôde ser lido.";
        };
    return montar(HttpStatus.BAD_REQUEST, "Requisição inválida", detalhe);
  }

  /** O multipart recusou o envio pelo tamanho antes de chegar a qualquer controller. */
  @ExceptionHandler(MaxUploadSizeExceededException.class)
  public ProblemDetail tratarEnvioGrandeDemais(MaxUploadSizeExceededException excecao) {
    contexto.registrarErro(excecao);
    return montar(
        HttpStatus.PAYLOAD_TOO_LARGE,
        "Arquivo grande demais",
        "Cada arquivo pode ter até 20 MB, e cada envio até 100 MB.");
  }

  /**
   * O que o Spring MVC recusa antes de chegar a um controller — método, tipo de conteúdo, rota ou
   * parte que não existe — é erro de quem chamou, com o status que o próprio Spring escolheu. Sem
   * isto, cada um viraria um 500 com stack trace.
   */
  @ExceptionHandler({
    HttpRequestMethodNotSupportedException.class,
    HttpMediaTypeNotSupportedException.class,
    HttpMediaTypeNotAcceptableException.class,
    NoResourceFoundException.class,
    MissingServletRequestPartException.class,
    ServletRequestBindingException.class,
    MultipartException.class
  })
  public ProblemDetail tratarRecusaDoProtocolo(Exception excecao) {
    contexto.registrarErro(excecao);
    return switch (excecao) {
      case HttpRequestMethodNotSupportedException metodo ->
          montar(
              HttpStatus.METHOD_NOT_ALLOWED,
              "Método não permitido",
              "Este endereço não aceita " + metodo.getMethod() + ".");
      case HttpMediaTypeNotSupportedException tipo ->
          montar(
              HttpStatus.UNSUPPORTED_MEDIA_TYPE,
              "Formato não aceito",
              "O conteúdo enviado não está num formato que este endereço aceita.");
      case HttpMediaTypeNotAcceptableException tipo ->
          montar(
              HttpStatus.NOT_ACCEPTABLE,
              "Formato indisponível",
              "Este endereço não responde no formato pedido.");
      case NoResourceFoundException rota ->
          montar(HttpStatus.NOT_FOUND, "Endereço inexistente", "O endereço pedido não existe.");
      case MissingServletRequestPartException parte ->
          montar(
              HttpStatus.BAD_REQUEST,
              "Requisição inválida",
              "Envie os arquivos no campo \"" + parte.getRequestPartName() + "\".");
      default ->
          montar(HttpStatus.BAD_REQUEST, "Requisição inválida", "A requisição está incompleta.");
    };
  }

  /**
   * A rede de segurança de uma validação que faltou: o banco recusou o que o request deixou passar
   * (um número maior que a coluna, um duplicado). Para quem chamou é um 4xx — tentar de novo não
   * vai mudar nada —, e para nós é um WARN, porque o request deveria ter barrado antes.
   */
  @ExceptionHandler(DataIntegrityViolationException.class)
  public ProblemDetail tratarViolacaoDeIntegridade(DataIntegrityViolationException excecao) {
    contexto.registrarErro(excecao);
    String estado =
        excecao.getMostSpecificCause() instanceof SQLException sql ? sql.getSQLState() : null;
    contexto.decisao("erro.sqlstate", estado);
    log.warn(
        "O banco recusou um valor que a validação deixou passar (sqlstate={}, requestId={})",
        estado,
        MDC.get(FiltroDeLinhaCanonica.CHAVE_MDC));
    if (UNICIDADE_VIOLADA.equals(estado)) {
      return montar(
          HttpStatus.CONFLICT, "Registro duplicado", "Já existe um registro com esses dados.");
    }
    return montar(
        HttpStatus.BAD_REQUEST,
        "Valor fora do limite",
        "Um dos valores informados passa do limite aceito. Confira os números e os textos longos.");
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

  private ProblemDetail dadosInvalidos(Map<String, String> campos) {
    ProblemDetail problema =
        montar(HttpStatus.BAD_REQUEST, TITULO_DADOS_INVALIDOS, DETALHE_DADOS_INVALIDOS);
    problema.setProperty(PROPRIEDADE_CAMPOS, campos);
    return problema;
  }

  private ProblemDetail montar(HttpStatus status, String titulo, String detalhe) {
    ProblemDetail problema = ProblemDetail.forStatus(status);
    problema.setTitle(titulo);
    problema.setDetail(detalhe);
    problema.setProperty(PROPRIEDADE_REQUISICAO, MDC.get(FiltroDeLinhaCanonica.CHAVE_MDC));
    return problema;
  }
}
