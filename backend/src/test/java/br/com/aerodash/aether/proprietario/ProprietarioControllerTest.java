package br.com.aerodash.aether.proprietario;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.aerodash.aether.autenticacao.AutenticacaoService;
import br.com.aerodash.aether.autenticacao.ConfiguracaoDeSeguranca;
import br.com.aerodash.aether.autenticacao.PapelDoUsuario;
import br.com.aerodash.aether.autenticacao.RespostaDeAcessoNegado;
import br.com.aerodash.aether.autenticacao.UsuarioAutenticado;
import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import br.com.aerodash.aether.comum.observabilidade.PoliticaDeCamposSensiveis;
import br.com.aerodash.aether.comum.observabilidade.SanitizadorDeLog;
import io.opentelemetry.api.OpenTelemetry;
import jakarta.servlet.http.Cookie;
import java.util.List;
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

@WebMvcTest(ProprietarioController.class)
@DisplayName("ProprietarioController")
class ProprietarioControllerTest {

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
  }

  private static final String TOKEN = "token-de-sessao";
  private static final UsuarioAutenticado GESTOR =
      new UsuarioAutenticado(2L, "Patrícia", PapelDoUsuario.GESTOR);
  private static final UsuarioAutenticado PILOTO =
      new UsuarioAutenticado(3L, "Caio", PapelDoUsuario.PILOTO);
  private static final ProprietarioResponse RICARDO =
      new ProprietarioResponse(
          1L,
          "Ricardo Meirelles",
          "12345678901",
          "ricardo@exemplo.com.br",
          "+55 11 98888-0000",
          CorDeIdentificacao.PETROLEO,
          SituacaoDoProprietario.ATIVO);

  @Autowired private MockMvc mockMvc;

  @MockitoBean private ProprietarioService proprietarios;
  @MockitoBean private AutenticacaoService autenticacao;

  @Test
  @DisplayName("qualquer papel lê a lista: nome e cor aparecem em grades da operação inteira")
  void qualquerPapelLe() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(PILOTO));
    when(proprietarios.listar()).thenReturn(List.of(RICARDO));

    mockMvc
        .perform(get("/proprietarios").cookie(new Cookie("aether_sessao", TOKEN)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].nome").value("Ricardo Meirelles"))
        .andExpect(jsonPath("$[0].corDeIdentificacao").value("PETROLEO"));
  }

  @Test
  @DisplayName("sem sessão, nem a lista: 401")
  void semSessaoNaoLe() throws Exception {
    mockMvc.perform(get("/proprietarios")).andExpect(status().isUnauthorized());
  }

  @Test
  @DisplayName("piloto não escreve: 403 antes do service")
  void pilotoNaoEscreve() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(PILOTO));

    mockMvc
        .perform(
            post("/proprietarios")
                .cookie(new Cookie("aether_sessao", TOKEN))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"nome":"Ricardo Meirelles","corDeIdentificacao":"PETROLEO"}
                    """))
        .andExpect(status().isForbidden());

    verify(proprietarios, never()).criar(any());
  }

  @Test
  @DisplayName("o gestor cadastra e recebe 201")
  void gestorCadastra() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(GESTOR));
    when(proprietarios.criar(any())).thenReturn(RICARDO);

    mockMvc
        .perform(
            post("/proprietarios")
                .cookie(new Cookie("aether_sessao", TOKEN))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"nome":"Ricardo Meirelles","cpfCnpj":"123.456.789-01",
                     "email":"ricardo@exemplo.com.br","telefone":"+55 11 98888-0000",
                     "corDeIdentificacao":"PETROLEO"}
                    """))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.id").value(1));
  }

  @Test
  @DisplayName("nome em branco é barrado pela validação, antes do service")
  void nomeEmBrancoEhBarrado() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(GESTOR));

    mockMvc
        .perform(
            post("/proprietarios")
                .cookie(new Cookie("aether_sessao", TOKEN))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"nome":"  ","corDeIdentificacao":"PETROLEO"}
                    """))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.nome").exists());

    verify(proprietarios, never()).criar(any());
  }

  @Test
  @DisplayName("o gestor atualiza o cadastro")
  void gestorAtualiza() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(GESTOR));
    when(proprietarios.atualizar(eq(1L), any())).thenReturn(RICARDO);

    mockMvc
        .perform(
            put("/proprietarios/1")
                .cookie(new Cookie("aether_sessao", TOKEN))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"nome":"Ricardo Meirelles","corDeIdentificacao":"AZUL"}
                    """))
        .andExpect(status().isOk());
  }

  @Test
  @DisplayName("desativação é POST de ação, não DELETE: o histórico fica")
  void gestorDesativa() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(GESTOR));
    when(proprietarios.desativar(1L)).thenReturn(RICARDO);

    mockMvc
        .perform(post("/proprietarios/1/desativacao").cookie(new Cookie("aether_sessao", TOKEN)))
        .andExpect(status().isOk());
  }
}
