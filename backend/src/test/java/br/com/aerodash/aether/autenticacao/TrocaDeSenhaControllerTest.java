package br.com.aerodash.aether.autenticacao;

import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import br.com.aerodash.aether.comum.observabilidade.PoliticaDeCamposSensiveis;
import br.com.aerodash.aether.comum.observabilidade.SanitizadorDeLog;
import io.opentelemetry.api.OpenTelemetry;
import jakarta.servlet.http.Cookie;
import java.time.Duration;
import java.util.Optional;
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
import org.springframework.test.web.servlet.ResultActions;

/**
 * A troca da própria senha, pela borda HTTP.
 *
 * <p>Classe separada de {@code AutenticacaoControllerTest} porque testa a metade LOGADA do mesmo
 * controller: aqui o interessante é que estes dois caminhos exigem sessão apesar de morarem sob
 * {@code /autenticacao}, que de resto é público.
 */
@WebMvcTest(AutenticacaoController.class)
@DisplayName("AutenticacaoController · troca de senha")
class TrocaDeSenhaControllerTest {

  @TestConfiguration
  @Import({
    ContextoDaRequisicao.class,
    SanitizadorDeLog.class,
    PoliticaDeCamposSensiveis.class,
    ConfiguracaoDeSeguranca.class,
    RespostaDeAcessoNegado.class
  })
  static class Dependencias {

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

  private static final String TOKEN_DE_SESSAO = "token-de-sessao";
  private static final UsuarioAutenticado LOGADO =
      new UsuarioAutenticado(7L, "Leonardo Andrade", PapelDoUsuario.GESTOR);

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

  @MockitoBean private TrocaDeSenhaService trocaDeSenha;

  @Test
  @DisplayName("trocar a própria senha sem sessão responde 401, apesar de estar sob /autenticacao")
  void trocarSenhaSemSessaoResponde401() throws Exception {
    mockMvc
        .perform(
            post("/autenticacao/senha")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"senhaAtual":"a-atual","novaSenha":"a-nova-senha","codigo":"042917"}
                    """))
        .andExpect(status().isUnauthorized());

    verify(trocaDeSenha, never())
        .trocar(anyLong(), anyString(), anyString(), anyString(), anyString());
  }

  @Test
  @DisplayName("com sessão, a troca leva o id e a sessão de quem pediu — nunca um id do corpo")
  void trocarSenhaLevaOIdDaSessao() throws Exception {
    when(autenticacao.autenticar(TOKEN_DE_SESSAO)).thenReturn(Optional.of(LOGADO));

    mockMvc
        .perform(
            post("/autenticacao/senha")
                .cookie(new Cookie("aether_sessao", TOKEN_DE_SESSAO))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"senhaAtual":"a-atual","novaSenha":"a-nova-senha","codigo":"042917"}
                    """))
        .andExpect(status().isNoContent());

    verify(trocaDeSenha).trocar(7L, TOKEN_DE_SESSAO, "a-atual", "a-nova-senha", "042917");
  }

  @Test
  @DisplayName("código fora do formato de seis dígitos é barrado antes do service")
  void codigoDeTrocaForaDoFormato() throws Exception {
    when(autenticacao.autenticar(TOKEN_DE_SESSAO)).thenReturn(Optional.of(LOGADO));

    mockMvc
        .perform(
            post("/autenticacao/senha")
                .cookie(new Cookie("aether_sessao", TOKEN_DE_SESSAO))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"senhaAtual":"a-atual","novaSenha":"a-nova-senha","codigo":"42"}
                    """))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.codigo").value("O código tem seis dígitos."));

    verify(trocaDeSenha, never())
        .trocar(anyLong(), anyString(), anyString(), anyString(), anyString());
  }

  @Test
  @DisplayName("senha com mais de 72 bytes é recusada no campo, e não vira 500 no BCrypt")
  void senhaAcimaDoLimiteDoBcryptEhRecusada() throws Exception {
    when(autenticacao.autenticar(TOKEN_DE_SESSAO)).thenReturn(Optional.of(LOGADO));
    String quarentaCedilhas = "ç".repeat(40);

    trocar(
            """
            {"senhaAtual":"a-atual","novaSenha":"%s","codigo":"042917"}
            """
                .formatted(quarentaCedilhas))
        .andExpect(status().isBadRequest())
        .andExpect(
            jsonPath("$.campos.novaSenha")
                .value(
                    "A senha passa do limite de 72 caracteres"
                        + " (letras acentuadas e símbolos contam como dois ou mais)."));

    verify(trocaDeSenha, never())
        .trocar(anyLong(), anyString(), anyString(), anyString(), anyString());
  }

  @Test
  @DisplayName("nova senha só de espaços é recusada como falta, no campo novaSenha")
  void novaSenhaSoDeEspacos() throws Exception {
    when(autenticacao.autenticar(TOKEN_DE_SESSAO)).thenReturn(Optional.of(LOGADO));

    trocar(
            """
            {"senhaAtual":"a-atual","novaSenha":"          ","codigo":"042917"}
            """)
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.novaSenha").value("Informe a nova senha."));
  }

  @Test
  @DisplayName("senha atual errada volta em campos.senhaAtual, e não numa frase solta")
  void senhaAtualErradaVoltaNoCampo() throws Exception {
    when(autenticacao.autenticar(TOKEN_DE_SESSAO)).thenReturn(Optional.of(LOGADO));
    doThrow(new SenhaAtualIncorretaException())
        .when(trocaDeSenha)
        .trocar(anyLong(), anyString(), anyString(), anyString(), anyString());

    trocar(
            """
            {"senhaAtual":"errada","novaSenha":"a-nova-senha","codigo":"042917"}
            """)
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.senhaAtual").value("A senha atual não confere."));
  }

  @Test
  @DisplayName("troca bloqueada responde 429 com o tempo que falta")
  void trocaBloqueadaResponde429() throws Exception {
    when(autenticacao.autenticar(TOKEN_DE_SESSAO)).thenReturn(Optional.of(LOGADO));
    doThrow(new TrocaDeSenhaBloqueadaException(15))
        .when(trocaDeSenha)
        .trocar(anyLong(), anyString(), anyString(), anyString(), anyString());

    trocar(
            """
            {"senhaAtual":"errada","novaSenha":"a-nova-senha","codigo":"042917"}
            """)
        .andExpect(status().isTooManyRequests())
        .andExpect(
            jsonPath("$.detail")
                .value(
                    "A conta está bloqueada por tentativas erradas de senha. Tente de novo em 15 minutos."));
  }

  private ResultActions trocar(String corpo) throws Exception {
    return mockMvc.perform(
        post("/autenticacao/senha")
            .cookie(new Cookie("aether_sessao", TOKEN_DE_SESSAO))
            .contentType(MediaType.APPLICATION_JSON)
            .content(corpo));
  }
}
