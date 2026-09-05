package br.com.aerodash.aether.autenticacao;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
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
  @Import({ContextoDaRequisicao.class, SanitizadorDeLog.class, PoliticaDeCamposSensiveis.class})
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
          "nao-responda@aether.com.br",
          false);
    }
  }

  private static final String EMAIL = "leonardo@administraair.com.br";

  @Autowired private MockMvc mockMvc;

  @MockitoBean private AutenticacaoService autenticacao;
  @MockitoBean private RecuperacaoDeSenhaService recuperacao;

  @Test
  @DisplayName("entrar devolve o usuário e o cookie HttpOnly da sessão")
  void entrarDevolveCookieDeSessao() throws Exception {
    when(autenticacao.entrar(EMAIL, "segredo"))
        .thenReturn(
            new SessaoAberta(
                "token-em-claro",
                Duration.ofHours(12),
                new SessaoResponse("Leonardo Andrade", EMAIL)));

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
                new SessaoResponse("Leonardo Andrade", EMAIL)));

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
    when(autenticacao.entrar(anyString(), anyString())).thenThrow(new AcessoBloqueadoException());

    mockMvc
        .perform(
            post("/autenticacao/entrar")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"senha\":\"errada\"}".formatted(EMAIL)))
        .andExpect(status().isTooManyRequests())
        .andExpect(jsonPath("$.title").value("Acesso temporariamente bloqueado"));
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
            jsonPath("$.campos.novaSenha").value("A nova senha precisa de ao menos 8 caracteres."));
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

    verify(recuperacao).solicitarCodigo("desconhecido@exemplo.com.br");
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
        .andExpect(jsonPath("$.title").value("Código inválido"));
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
