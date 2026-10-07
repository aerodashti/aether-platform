package br.com.aerodash.aether.autenticacao;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import br.com.aerodash.aether.comum.observabilidade.PoliticaDeCamposSensiveis;
import br.com.aerodash.aether.comum.observabilidade.SanitizadorDeLog;
import io.opentelemetry.api.OpenTelemetry;
import java.time.Duration;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/**
 * A recuperação de senha e a conclusão do convite, pela borda HTTP: os caminhos da área não logada
 * que criam senha. Classe separada de {@code AutenticacaoControllerTest}, que cobre entrar e sair.
 */
@WebMvcTest(AutenticacaoController.class)
@DisplayName("AutenticacaoController · recuperação e convite")
class RecuperacaoDeSenhaControllerTest {

  /** Mesmo arranjo do SaudeControllerTest: o filtro da linha canônica precisa das colaborações. */
  @TestConfiguration
  // A cadeia de autorização real entra por importação explícita: o slice do @WebMvcTest não a
  // carrega sozinho, e sem ela vale o padrão do starter — tudo fechado, e /saude responderia 401.
  @Import({
    ContextoDaRequisicao.class,
    SanitizadorDeLog.class,
    PoliticaDeCamposSensiveis.class,
    ConfiguracaoDeSeguranca.class,
    RespostaDeAcessoNegado.class
  })
  static class ObservabilidadeDeTeste {

    @Bean
    OpenTelemetry openTelemetry() {
      return OpenTelemetry.noop();
    }

    @Bean
    PropriedadesDeAutenticacao propriedadesDeAutenticacao() {
      return new PropriedadesDeAutenticacao(
          Duration.ofHours(12),
          5,
          Duration.ofMinutes(15),
          Duration.ofMinutes(10),
          5,
          Duration.ofMinutes(1),
          Duration.ofDays(2),
          "http://localhost:5173/entrar",
          "nao-responda@aether.com.br",
          false);
    }
  }

  private static final String EMAIL = "leonardo@administraair.com.br";

  @Autowired private MockMvc mockMvc;

  @MockitoBean private SolicitacaoDeCodigoService solicitacaoDeCodigo;
  @MockitoBean private RecuperacaoDeSenhaService recuperacao;
  @MockitoBean private ConviteService convites;

  /** Dependências do controller que esta classe não exercita; têm teste próprio. */
  @SuppressWarnings("UnusedVariable")
  @MockitoBean
  private AutenticacaoService autenticacao;

  /**
   * Dependência do controller; a troca de senha tem teste próprio em TrocaDeSenhaControllerTest.
   */
  @SuppressWarnings("UnusedVariable")
  @MockitoBean
  private TrocaDeSenhaService trocaDeSenha;

  @Test
  @DisplayName("senha nova curta demais é barrada pela validação")
  void senhaCurtaEBarrada() throws Exception {
    mockMvc
        .perform(
            post("/autenticacao/recuperacao/senha")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"email\":\"%s\",\"codigo\":\"519274\",\"novaSenha\":\"curta\"}"
                        .formatted(EMAIL)))
        .andExpect(status().isBadRequest())
        .andExpect(
            jsonPath("$.campos.novaSenha").value("A senha precisa de ao menos 8 caracteres."));
  }

  @Test
  @DisplayName("senha nova acima de 72 bytes é barrada na validação, e não vira 500 no BCrypt")
  void senhaAcimaDoLimiteDoBcryptEhBarrada() throws Exception {
    mockMvc
        .perform(
            post("/autenticacao/recuperacao/senha")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"email\":\"%s\",\"codigo\":\"519274\",\"novaSenha\":\"%s\"}"
                        .formatted(EMAIL, "ç".repeat(37))))
        .andExpect(status().isBadRequest())
        .andExpect(
            jsonPath("$.campos.novaSenha")
                .value(
                    "A senha passa do limite de 72 caracteres"
                        + " (letras acentuadas e símbolos contam como dois ou mais)."));

    verify(recuperacao, never()).redefinirSenha(anyString(), anyString(), anyString());
  }

  @Test
  @DisplayName("senha nova igual à atual volta no campo novaSenha")
  void senhaRepetidaVoltaNoCampo() throws Exception {
    doThrow(new SenhaRepetidaException())
        .when(recuperacao)
        .redefinirSenha(anyString(), anyString(), anyString());

    mockMvc
        .perform(
            post("/autenticacao/recuperacao/senha")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"email\":\"%s\",\"codigo\":\"519274\",\"novaSenha\":\"a-mesma-senha\"}"
                        .formatted(EMAIL)))
        .andExpect(status().isBadRequest())
        .andExpect(
            jsonPath("$.campos.novaSenha").value("A nova senha precisa ser diferente da atual."));
  }

  @Test
  @DisplayName("código fora do formato de seis dígitos é barrado")
  void codigoForaDoFormatoEBarrado() throws Exception {
    mockMvc
        .perform(
            post("/autenticacao/recuperacao/codigo")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"codigo\":\"12ab\"}".formatted(EMAIL)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.codigo").value("O código tem seis dígitos."));
  }

  @Test
  @DisplayName("pedir código responde 202 mesmo para e-mail que não existe")
  void pedirCodigoRespondeSempre202() throws Exception {
    mockMvc
        .perform(
            post("/autenticacao/recuperacao")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"desconhecido@exemplo.com.br\"}"))
        .andExpect(status().isAccepted());

    verify(solicitacaoDeCodigo).solicitar("desconhecido@exemplo.com.br");
  }

  @Test
  @DisplayName("código inválido vira Problem Details 400")
  void codigoInvalidoViraProblemDetails() throws Exception {
    doThrow(new CodigoInvalidoException())
        .when(recuperacao)
        .validarCodigo(anyString(), anyString());

    mockMvc
        .perform(
            post("/autenticacao/recuperacao/codigo")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"codigo\":\"000000\"}".formatted(EMAIL)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.title").value("Código inválido"))
        .andExpect(
            jsonPath("$.campos.codigo")
                .value("Código incorreto ou expirado. Confira os dígitos ou peça um novo."));
  }

  @Test
  @DisplayName("o convidado cria a própria senha pelo link, sem sessão")
  void concluirConviteResponde204() throws Exception {
    mockMvc
        .perform(
            post("/autenticacao/convite/senha")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"convite":"token-do-link","novaSenha":"minha-senha-nova"}
                    """))
        .andExpect(status().isNoContent());

    verify(convites).concluir("token-do-link", "minha-senha-nova");
  }

  @Test
  @DisplayName("senha curta demais é barrada pela validação, antes do service")
  void senhaCurtaEhBarrada() throws Exception {
    mockMvc
        .perform(
            post("/autenticacao/convite/senha")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"convite":"token-do-link","novaSenha":"curta"}
                    """))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.novaSenha").exists());

    verify(convites, never()).concluir(anyString(), anyString());
  }

  @Test
  @DisplayName("convite com senha acima de 72 bytes é barrado, mesmo com 72 caracteres ou menos")
  void conviteComSenhaAcimaDoLimiteEhBarrado() throws Exception {
    mockMvc
        .perform(
            post("/autenticacao/convite/senha")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"convite\":\"token-do-link\",\"novaSenha\":\"%s\"}"
                        .formatted("ç".repeat(72))))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.novaSenha").exists());

    verify(convites, never()).concluir(anyString(), anyString());
  }
}
