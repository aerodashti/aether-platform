package br.com.aerodash.aether.autenticacao;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import br.com.aerodash.aether.comum.observabilidade.PoliticaDeCamposSensiveis;
import br.com.aerodash.aether.comum.observabilidade.SanitizadorDeLog;
import io.opentelemetry.api.OpenTelemetry;
import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/**
 * A tela de Usuários pela borda HTTP.
 *
 * <p>Estes testes existem sobretudo por uma frase: "página restrita, visível apenas para
 * administradores". Ela vale se — e só se — a cadeia de autorização recusar quem não é, e é ela que
 * está sob teste aqui, não o mock do serviço.
 */
@WebMvcTest(UsuarioController.class)
@DisplayName("UsuarioController")
class UsuarioControllerTest {

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
  private static final UsuarioAutenticado ADMINISTRADOR =
      new UsuarioAutenticado(1L, "Leonardo Andrade", PapelDoUsuario.ADMINISTRADOR);
  private static final UsuarioAutenticado GESTOR =
      new UsuarioAutenticado(2L, "Patrícia Gomes", PapelDoUsuario.GESTOR);

  @Autowired private MockMvc mockMvc;

  @MockitoBean private UsuarioService usuarios;
  @MockitoBean private AutenticacaoService autenticacao;

  @Test
  @DisplayName("sem cookie de sessão responde 401 em Problem Details")
  void semSessaoResponde401() throws Exception {
    mockMvc
        .perform(get("/usuarios"))
        .andExpect(status().isUnauthorized())
        .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
        .andExpect(jsonPath("$.title").value("Sessão encerrada"));

    verify(usuarios, never()).listar(any(), any(), any(), any());
  }

  @Test
  @DisplayName("quem entrou mas não é administrador responde 403, não 401")
  void naoAdministradorResponde403() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(GESTOR));

    mockMvc
        .perform(get("/usuarios").cookie(new Cookie("aether_sessao", TOKEN)))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.title").value("Acesso restrito"));

    verify(usuarios, never()).listar(any(), any(), any(), any());
  }

  @Test
  @DisplayName("administrador lista os usuários com a paginação da tela")
  void administradorListaUsuarios() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(ADMINISTRADOR));
    when(usuarios.listar(any(), any(), any(), any()))
        .thenReturn(
            new org.springframework.data.domain.PageImpl<>(
                List.of(
                    new UsuarioResponse(
                        1L,
                        "Leonardo Andrade",
                        "leonardo@administraair.com.br",
                        PapelDoUsuario.ADMINISTRADOR,
                        SituacaoDoUsuario.ATIVO,
                        Instant.parse("2026-09-04T12:00:00Z"))),
                PageRequest.of(0, 20),
                1));

    mockMvc
        .perform(get("/usuarios").cookie(new Cookie("aether_sessao", TOKEN)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.itens[0].papel").value("ADMINISTRADOR"))
        .andExpect(jsonPath("$.itens[0].situacao").value("ATIVO"))
        .andExpect(jsonPath("$.total").value(1))
        .andExpect(jsonPath("$.totalDePaginas").value(1));
  }

  @Test
  @DisplayName("convidar responde 201 com a linha recém-criada")
  void convidarResponde201() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(ADMINISTRADOR));
    when(usuarios.convidar("Camila Nogueira", "camila@administraair.com.br", PapelDoUsuario.GESTOR))
        .thenReturn(
            new UsuarioResponse(
                9L,
                "Camila Nogueira",
                "camila@administraair.com.br",
                PapelDoUsuario.GESTOR,
                SituacaoDoUsuario.PENDENTE,
                null));

    mockMvc
        .perform(
            post("/usuarios")
                .cookie(new Cookie("aether_sessao", TOKEN))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"nome":"Camila Nogueira","email":"camila@administraair.com.br",
                     "papel":"GESTOR"}
                    """))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.situacao").value("PENDENTE"))
        .andExpect(jsonPath("$.ultimoAcesso").doesNotExist());
  }

  @Test
  @DisplayName("convite sem papel é barrado pela validação, antes do service")
  void conviteSemPapelEhBarrado() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(ADMINISTRADOR));

    mockMvc
        .perform(
            post("/usuarios")
                .cookie(new Cookie("aether_sessao", TOKEN))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"nome":"Camila","email":"camila@administraair.com.br"}
                    """))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.papel").value("Escolha o papel."));

    verify(usuarios, never()).convidar(any(), any(), any());
  }

  @Test
  @DisplayName("reenviar convite responde 202: o que se garante é que o convite saiu")
  void reenviarResponde202() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(ADMINISTRADOR));

    mockMvc
        .perform(post("/usuarios/9/convite").cookie(new Cookie("aether_sessao", TOKEN)))
        .andExpect(status().isAccepted());

    verify(usuarios).reenviarConvite(9L);
  }

  @Test
  @DisplayName("desativar leva quem pediu junto — é assim que a regra de si mesmo é aplicável")
  void desativarLevaOSolicitante() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(ADMINISTRADOR));
    when(usuarios.desativar(9L, ADMINISTRADOR))
        .thenReturn(
            new UsuarioResponse(
                9L,
                "Camila Nogueira",
                "camila@administraair.com.br",
                PapelDoUsuario.GESTOR,
                SituacaoDoUsuario.INATIVO,
                null));

    mockMvc
        .perform(post("/usuarios/9/desativacao").cookie(new Cookie("aether_sessao", TOKEN)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.situacao").value("INATIVO"));

    verify(usuarios).desativar(9L, ADMINISTRADOR);
  }

  @Test
  @DisplayName("página de outro tamanho e ordenação chegam ao serviço")
  void paginacaoChegaAoServico() throws Exception {
    when(autenticacao.autenticar(TOKEN)).thenReturn(Optional.of(ADMINISTRADOR));
    when(usuarios.listar(any(), any(), any(), any())).thenReturn(Page.empty());

    mockMvc
        .perform(
            get("/usuarios")
                .param("busca", "nogueira")
                .param("papel", "GESTOR")
                .param("situacao", "PENDENTE")
                .param("page", "1")
                .param("size", "5")
                .cookie(new Cookie("aether_sessao", TOKEN)))
        .andExpect(status().isOk());

    verify(usuarios)
        .listar(
            "nogueira",
            PapelDoUsuario.GESTOR,
            SituacaoDoUsuario.PENDENTE,
            PageRequest.of(1, 5, org.springframework.data.domain.Sort.by("nome")));
  }
}
