package br.com.aerodash.aether.comum.erro;

import static org.mockito.Mockito.mock;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.Jackson2ObjectMapperBuilder;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@DisplayName("TratadorGlobalDeErros")
class TratadorGlobalDeErrosTest {

  enum Cor {
    AZUL
  }

  record Item(@NotNull BigDecimal valor) {}

  record Pedido(
      @NotBlank(message = "Informe a descrição.")
          @Size(min = 3, message = "Use ao menos 3 caracteres.")
          String descricao,
      Cor cor,
      LocalDate data,
      Integer quantidade,
      List<Item> itens) {}

  static final class RecusaDeCampo extends ExcecaoDeDominio {
    private static final long serialVersionUID = 1L;

    RecusaDeCampo() {
      super("CPF ou CNPJ inválido", "Confira os dígitos do documento.", "cpfCnpj");
    }

    @Override
    public HttpStatus getStatus() {
      return HttpStatus.BAD_REQUEST;
    }
  }

  @RestController
  static class Controlador {

    @PostMapping("/pedidos")
    void criar(@Valid @RequestBody Pedido pedido) {
      // Só o que chega até aqui interessa: o tratador age antes.
    }

    @PostMapping("/documentos")
    void documento() {
      throw new RecusaDeCampo();
    }

    @PostMapping("/duplicado")
    void duplicado() {
      throw new DataIntegrityViolationException("duplicado", new SQLException("unique", "23505"));
    }

    @PostMapping("/estouro")
    void estouro() {
      throw new DataIntegrityViolationException(
          "estouro", new SQLException("numeric field overflow", "22003"));
    }

    @GetMapping("/somente-leitura")
    String ler() {
      return "ok";
    }
  }

  private MockMvc mvc;

  @BeforeEach
  void preparar() {
    // A mesma configuração do application.yml: casas num campo inteiro não são truncadas.
    ObjectMapper mapeador =
        Jackson2ObjectMapperBuilder.json()
            .featuresToDisable(DeserializationFeature.ACCEPT_FLOAT_AS_INT)
            .build();
    LocalValidatorFactoryBean validador = new LocalValidatorFactoryBean();
    validador.afterPropertiesSet();
    mvc =
        MockMvcBuilders.standaloneSetup(new Controlador())
            .setControllerAdvice(new TratadorGlobalDeErros(mock(ContextoDaRequisicao.class)))
            .setMessageConverters(new MappingJackson2HttpMessageConverter(mapeador))
            .setValidator(validador)
            .build();
  }

  private org.springframework.test.web.servlet.ResultActions enviar(String json) throws Exception {
    return mvc.perform(post("/pedidos").contentType(MediaType.APPLICATION_JSON).content(json));
  }

  @Test
  @DisplayName("com duas violações no mesmo campo, vale a da falta")
  void faltaPrimeiro() throws Exception {
    enviar("{\"descricao\":\" \"}")
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.descricao").value("Informe a descrição."));
  }

  @Test
  @DisplayName("opção que não existe vira erro do campo, não 'corpo ilegível'")
  void enumDesconhecido() throws Exception {
    enviar("{\"descricao\":\"Pouso\",\"cor\":\"ROXO\"}")
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.title").value("Dados inválidos"))
        .andExpect(jsonPath("$.campos.cor").value("Escolha uma das opções da lista."));
  }

  @Test
  @DisplayName("data em outro formato diz o formato esperado")
  void dataInvalida() throws Exception {
    enviar("{\"descricao\":\"Pouso\",\"data\":\"31/12/2026\"}")
        .andExpect(status().isBadRequest())
        .andExpect(
            jsonPath("$.campos.data").value("Informe uma data que exista, no formato AAAA-MM-DD."));
  }

  @Test
  @DisplayName("número com casas num campo inteiro é recusado, e não truncado")
  void decimalEmInteiro() throws Exception {
    enviar("{\"descricao\":\"Pouso\",\"quantidade\":1.5}")
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.quantidade").value("Informe um número inteiro."));
  }

  @Test
  @DisplayName("o caminho de um campo dentro de lista chega com o índice")
  void campoEmLista() throws Exception {
    enviar("{\"descricao\":\"Pouso\",\"itens\":[{\"valor\":\"1.000,00\"}]}")
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos['itens[0].valor']").exists());
  }

  @Test
  @DisplayName("JSON que nem se lê continua com a mensagem geral, sem campos")
  void jsonQuebrado() throws Exception {
    enviar("{\"descricao\":")
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.detail").value("O corpo da requisição não pôde ser lido."))
        .andExpect(jsonPath("$.campos").doesNotExist());
  }

  @Test
  @DisplayName("recusa de negócio de um campo só diz qual campo")
  void recusaDeCampo() throws Exception {
    mvc.perform(post("/documentos"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.cpfCnpj").value("Confira os dígitos do documento."));
  }

  @Test
  @DisplayName("método errado é 405, não 500")
  void metodoErrado() throws Exception {
    mvc.perform(post("/somente-leitura")).andExpect(status().isMethodNotAllowed());
  }

  @Test
  @DisplayName("tipo de conteúdo errado é 415, não 500")
  void tipoErrado() throws Exception {
    mvc.perform(post("/pedidos").contentType(MediaType.TEXT_PLAIN).content("x"))
        .andExpect(status().isUnsupportedMediaType());
  }

  @Test
  @DisplayName("duplicado barrado pelo banco é 409; número grande demais para a coluna é 400")
  void violacaoDeIntegridade() throws Exception {
    mvc.perform(post("/duplicado")).andExpect(status().isConflict());
    mvc.perform(post("/estouro"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.title").value("Valor fora do limite"));
  }
}
