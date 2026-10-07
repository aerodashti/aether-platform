package br.com.aerodash.aether.autenticacao;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import br.com.aerodash.aether.comum.observabilidade.PoliticaDeCamposSensiveis;
import br.com.aerodash.aether.comum.observabilidade.SanitizadorDeLog;
import io.opentelemetry.api.OpenTelemetry;
import jakarta.servlet.http.Cookie;
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

@WebMvcTest(AutenticacaoController.class)
@DisplayName("AutenticacaoController")
class AutenticacaoControllerTest {

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

  @MockitoBean private AutenticacaoService autenticacao;

  /** Dependências do controller que esta classe não exercita; têm teste próprio. */
  @SuppressWarnings("UnusedVariable")
  @MockitoBean
  private SolicitacaoDeCodigoService solicitacaoDeCodigo;

  @SuppressWarnings("UnusedVariable")
  @MockitoBean
  private RecuperacaoDeSenhaService recuperacao;

  @SuppressWarnings("UnusedVariable")
  @MockitoBean
  private ConviteService convites;

  /**
   * Dependência do controller; a troca de senha tem teste próprio em TrocaDeSenhaControllerTest.
   */
  @SuppressWarnings("UnusedVariable")
  @MockitoBean
  private TrocaDeSenhaService trocaDeSenha;

  @Test
  @DisplayName("entrar devolve o usuário e o cookie HttpOnly da sessão")
  void entrarDevolveCookieDeSessao() throws Exception {
    when(autenticacao.entrar(EMAIL, "segredo"))
        .thenReturn(
            new SessaoAberta(
                "token-em-claro",
                Duration.ofHours(12),
                new SessaoResponse("Leonardo Andrade", EMAIL, PapelDoUsuario.ADMINISTRADOR)));

    mockMvc
        .perform(
            post("/autenticacao/entrar")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"senha\":\"segredo\"}".formatted(EMAIL)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.nome").value("Leonardo Andrade"))
        .andExpect(cookie().value("aether_sessao", "token-em-claro"))
        .andExpect(cookie().httpOnly("aether_sessao", true))
        .andExpect(cookie().maxAge("aether_sessao", (int) Duration.ofHours(12).toSeconds()));
  }

  @Test
  @DisplayName("o token de sessão não aparece no corpo da resposta")
  void tokenNaoVazaNoCorpo() throws Exception {
    when(autenticacao.entrar(anyString(), anyString()))
        .thenReturn(
            new SessaoAberta(
                "token-secreto",
                Duration.ofHours(12),
                new SessaoResponse("Leonardo Andrade", EMAIL, PapelDoUsuario.ADMINISTRADOR)));

    String corpo =
        mockMvc
            .perform(
                post("/autenticacao/entrar")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"email\":\"%s\",\"senha\":\"segredo\"}".formatted(EMAIL)))
            .andReturn()
            .getResponse()
            .getContentAsString();

    assertThat(corpo).doesNotContain("token-secreto");
  }

  @Test
  @DisplayName("credencial inválida vira Problem Details 401 sem dizer qual campo errou")
  void credencialInvalidaViraProblemDetails() throws Exception {
    when(autenticacao.entrar(anyString(), anyString()))
        .thenThrow(new CredenciaisInvalidasException());

    mockMvc
        .perform(
            post("/autenticacao/entrar")
                .header("X-Request-Id", "abc-123")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"senha\":\"errada\"}".formatted(EMAIL)))
        .andExpect(status().isUnauthorized())
        .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
        .andExpect(jsonPath("$.title").value("Não foi possível entrar"))
        .andExpect(jsonPath("$.detail").value("E-mail ou senha incorretos."))
        .andExpect(jsonPath("$.requisicao").value("abc-123"));
  }

  @Test
  @DisplayName("conta bloqueada responde 429")
  void contaBloqueadaResponde429() throws Exception {
    when(autenticacao.entrar(anyString(), anyString()))
        .thenThrow(new AcessoBloqueadoException(Duration.ofMinutes(15)));

    mockMvc
        .perform(
            post("/autenticacao/entrar")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"senha\":\"errada\"}".formatted(EMAIL)))
        .andExpect(status().isTooManyRequests())
        .andExpect(jsonPath("$.title").value("Acesso temporariamente bloqueado"))
        .andExpect(
            jsonPath("$.detail")
                .value("Tentativas demais em sequência. Tente de novo em 15 minutos."));
  }

  @Test
  @DisplayName("senha longa demais no login é barrada antes de procurar o e-mail")
  void senhaLongaNoLoginEhBarrada() throws Exception {
    mockMvc
        .perform(
            post("/autenticacao/entrar")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"senha\":\"%s\"}".formatted(EMAIL, "a".repeat(73))))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.senha").value("A senha tem no máximo 72 caracteres."));

    verify(autenticacao, never()).entrar(anyString(), anyString());
  }

  @Test
  @DisplayName("método ou formato errado responde 405 e 415, não 500")
  void recusasDoProtocoloMantemOStatus() throws Exception {
    mockMvc.perform(get("/autenticacao/entrar")).andExpect(status().isMethodNotAllowed());
    mockMvc
        .perform(
            post("/autenticacao/recuperacao")
                .contentType(MediaType.TEXT_PLAIN)
                .content("email=%s".formatted(EMAIL)))
        .andExpect(status().isUnsupportedMediaType());
  }

  @Test
  @DisplayName("e-mail malformado é barrado pela validação, antes do service")
  void emailMalformadoNaoChegaAoService() throws Exception {
    mockMvc
        .perform(
            post("/autenticacao/entrar")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"nao-e-email\",\"senha\":\"segredo\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.title").value("Dados inválidos"))
        .andExpect(jsonPath("$.campos.email").value("Informe um e-mail válido."));

    verify(autenticacao, org.mockito.Mockito.never()).entrar(anyString(), anyString());
  }

  @Test
  @DisplayName("consultar a sessão sem cookie responde 401")
  void sessaoSemCookieResponde401() throws Exception {
    when(autenticacao.consultarSessao(any())).thenThrow(new SessaoInvalidaException());

    mockMvc
        .perform(get("/autenticacao/sessao"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.title").value("Sessão encerrada"));
  }

  @Test
  @DisplayName("sair encerra a sessão e apaga o cookie")
  void sairApagaOCookie() throws Exception {
    mockMvc
        .perform(delete("/autenticacao/sessao").cookie(new Cookie("aether_sessao", "token")))
        .andExpect(status().isNoContent())
        .andExpect(cookie().maxAge("aether_sessao", 0))
        .andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.containsString("HttpOnly")));

    verify(autenticacao).sair("token");
  }
}
