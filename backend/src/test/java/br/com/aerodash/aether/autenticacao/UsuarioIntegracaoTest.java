package br.com.aerodash.aether.autenticacao;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * A tela de Usuários contra um PostgreSQL de verdade: migration, CHECK do papel, autorização e o
 * convite indo e voltando.
 *
 * <p>Vale por si mesmo mesmo com os testes de unidade verdes: {@code ddl-auto: validate} só compara
 * entidade e esquema quando existe banco, e a recusa por papel só é verdadeira com a cadeia de
 * filtros inteira no ar.
 *
 * <p><b>Cada teste que altera um usuário cria o seu</b>, pela razão explicada em {@code
 * AutenticacaoIntegracaoTest}: banco e contexto são compartilhados e nada é desfeito ao fim.
 *
 * <p>Exige Docker. Fica fora do {@code check}: rode com {@code ./gradlew testeIntegracao}.
 */
@Tag("integracao")
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@DisplayName("Usuários (integração)")
class UsuarioIntegracaoTest {

  @Container @ServiceConnection
  static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

  private static final String ADMINISTRADOR = "leonardo@administraair.com.br";
  private static final String GESTOR = "patricia@administraair.com.br";
  private static final String SENHA = "aether-dev-2026";

  @Autowired private MockMvc mockMvc;
  @Autowired private UsuarioRepository usuarios;

  /** Substitui o envio real para capturar o token do link sorteado. */
  @MockitoBean private EnviadorDeConvite enviador;

  @Test
  @DisplayName("o seed distribui os quatro papéis")
  void seedDistribuiOsQuatroPapeis() {
    assertThat(usuarios.findByEmail(ADMINISTRADOR))
        .get()
        .satisfies(usuario -> assertThat(usuario.ehAdministrador()).isTrue());
    assertThat(usuarios.findByEmail(GESTOR))
        .get()
        .satisfies(usuario -> assertThat(usuario.getPapel()).isEqualTo(PapelDoUsuario.GESTOR));
    assertThat(usuarios.findByEmail("camila@administraair.com.br"))
        .get()
        .satisfies(
            usuario -> assertThat(usuario.getPapel()).isEqualTo(PapelDoUsuario.PROPRIETARIO));
    assertThat(usuarios.findByEmail("diego.furtado@administraair.com.br"))
        .get()
        .satisfies(usuario -> assertThat(usuario.getPapel()).isEqualTo(PapelDoUsuario.PILOTO));
  }

  @Test
  @DisplayName("sem sessão a lista responde 401; com sessão de gestor, 403")
  void listaRecusaQuemNaoEhAdministrador() throws Exception {
    mockMvc.perform(get("/usuarios")).andExpect(status().isUnauthorized());

    mockMvc
        .perform(get("/usuarios").cookie(entrar(GESTOR)))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.title").value("Acesso restrito"));
  }

  @Test
  @DisplayName("o administrador vê a lista, e o filtro de papel corta o resto")
  void administradorFiltraPorPapel() throws Exception {
    Cookie sessao = entrar(ADMINISTRADOR);

    mockMvc
        .perform(get("/usuarios").cookie(sessao))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.itens").isNotEmpty());

    // Quantos pilotos existem depende de quais outros testes já rodaram — o banco é compartilhado.
    // O que o filtro promete não é a contagem: é que nada fora do papel pedido atravessa.
    mockMvc
        .perform(get("/usuarios").param("papel", "PILOTO").cookie(sessao))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.itens").isNotEmpty())
        .andExpect(jsonPath("$.itens[?(@.papel != 'PILOTO')]").isEmpty());
  }

  @Test
  @DisplayName("convidar, receber o link e criar a própria senha ativa o acesso")
  void conviteVaiEVolta() throws Exception {
    Cookie sessao = entrar(ADMINISTRADOR);
    String email = "convidado.integracao@administraair.com.br";

    mockMvc
        .perform(
            post("/usuarios")
                .cookie(sessao)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"nome":"Convidado Integração","email":"%s","papel":"PILOTO"}
                    """
                        .formatted(email)))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.situacao").value("PENDENTE"));

    ArgumentCaptor<String> token = ArgumentCaptor.forClass(String.class);
    org.mockito.Mockito.verify(enviador)
        .enviar(org.mockito.ArgumentMatchers.any(), token.capture());

    mockMvc
        .perform(
            post("/autenticacao/convite/senha")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"convite":"%s","novaSenha":"senha-do-convidado"}
                    """
                        .formatted(token.getValue())))
        .andExpect(status().isNoContent());

    assertThat(usuarios.findByEmail(email))
        .get()
        .satisfies(
            usuario -> {
              assertThat(usuario.estaAtivo()).isTrue();
              assertThat(usuario.possuiSenha()).isTrue();
              assertThat(usuario.getPapel()).isEqualTo(PapelDoUsuario.PILOTO);
            });
  }

  @Test
  @DisplayName("e-mail repetido responde 409 e o link do convite não é reemitido")
  void emailRepetidoResponde409() throws Exception {
    mockMvc
        .perform(
            post("/usuarios")
                .cookie(entrar(ADMINISTRADOR))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"nome":"Outro Leonardo","email":"%s","papel":"GESTOR"}
                    """
                        .formatted(ADMINISTRADOR)))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.title").value("E-mail já cadastrado"));
  }

  @Test
  @DisplayName("o administrador não desativa a si mesmo")
  void administradorNaoDesativaASiMesmo() throws Exception {
    Long id = usuarios.findByEmail(ADMINISTRADOR).orElseThrow().getId();

    mockMvc
        .perform(post("/usuarios/" + id + "/desativacao").cookie(entrar(ADMINISTRADOR)))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.title").value("Ação não permitida"));

    assertThat(usuarios.findByEmail(ADMINISTRADOR))
        .get()
        .satisfies(u -> assertThat(u.estaAtivo()).isTrue());
  }

  @Test
  @DisplayName("desativar corta o acesso de quem já estava dentro no próximo request")
  void desativarCortaOAcesso() throws Exception {
    Cookie sessaoDoGestor = entrar(GESTOR);
    Long id = usuarios.findByEmail(GESTOR).orElseThrow().getId();

    mockMvc
        .perform(post("/usuarios/" + id + "/desativacao").cookie(entrar(ADMINISTRADOR)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.situacao").value("INATIVO"));

    // A sessão continua vigente: revogar o papel não encerra sessão aberta. Ver
    // docs/arquitetura.md.
    mockMvc.perform(get("/autenticacao/sessao").cookie(sessaoDoGestor)).andExpect(status().isOk());

    mockMvc
        .perform(post("/usuarios/" + id + "/reativacao").cookie(entrar(ADMINISTRADOR)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.situacao").value("ATIVO"));
  }

  private Cookie entrar(String email) throws Exception {
    MvcResult resultado =
        mockMvc
            .perform(
                post("/autenticacao/entrar")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {"email":"%s","senha":"%s"}
                        """
                            .formatted(email, SENHA)))
            .andExpect(status().isOk())
            .andReturn();
    return resultado.getResponse().getCookie("aether_sessao");
  }
}
