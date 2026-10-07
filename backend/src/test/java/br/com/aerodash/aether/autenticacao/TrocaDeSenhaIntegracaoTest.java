package br.com.aerodash.aether.autenticacao;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import java.time.Instant;
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
import org.springframework.test.web.servlet.ResultActions;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * A troca da própria senha contra um PostgreSQL de verdade: a consulta das outras sessões e a
 * contagem de falhas que precisa sobreviver à recusa.
 *
 * <p>Cada teste cria o seu usuário, pela razão explicada em {@code AutenticacaoIntegracaoTest}.
 *
 * <p>Exige Docker. Fica fora do {@code check}: rode com {@code ./gradlew testeIntegracao}.
 */
@Tag("integracao")
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@DisplayName("Troca de senha (integração)")
class TrocaDeSenhaIntegracaoTest {

  @Container @ServiceConnection
  static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

  private static final String SENHA = "senha-de-partida";
  private static final String NOVA_SENHA = "senha-de-chegada";

  @Autowired private MockMvc mockMvc;
  @Autowired private UsuarioRepository usuarios;
  @Autowired private CofreDeSegredos cofre;

  /** Substitui o envio real para capturar o código de seis dígitos sorteado. */
  @MockitoBean private EnviadorDeCodigoDeRecuperacao enviador;

  @Test
  @DisplayName("trocar a senha encerra a outra sessão e mantém a de quem trocou")
  void trocarEncerraAOutraSessao() throws Exception {
    String email = criarAtivo("troca.sessoes");
    Cookie aqui = entrar(email);
    Cookie outra = entrar(email);

    trocar(aqui, SENHA, pedirCodigo(aqui)).andExpect(status().isNoContent());

    mockMvc.perform(get("/autenticacao/sessao").cookie(aqui)).andExpect(status().isOk());
    mockMvc.perform(get("/autenticacao/sessao").cookie(outra)).andExpect(status().isUnauthorized());
  }

  @Test
  @DisplayName("a quinta senha atual errada tranca a conta, e a entrada também recusa")
  void senhaAtualErradaTrancaAConta() throws Exception {
    String email = criarAtivo("troca.bloqueio");
    Cookie sessao = entrar(email);

    for (int tentativa = 1; tentativa < 5; tentativa++) {
      trocar(sessao, "senha-errada", "000000")
          .andExpect(status().isBadRequest())
          .andExpect(jsonPath("$.campos.senhaAtual").value("A senha atual não confere."));
    }
    trocar(sessao, "senha-errada", "000000")
        .andExpect(status().isTooManyRequests())
        .andExpect(
            jsonPath("$.detail")
                .value("Tentativas demais com a senha atual. Tente de novo em 15 minutos."));

    mockMvc
        .perform(
            post("/autenticacao/entrar")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"email":"%s","senha":"%s"}
                    """
                        .formatted(email, SENHA)))
        .andExpect(status().isTooManyRequests());
  }

  private ResultActions trocar(Cookie sessao, String senhaAtual, String codigo) throws Exception {
    return mockMvc.perform(
        post("/autenticacao/senha")
            .cookie(sessao)
            .contentType(MediaType.APPLICATION_JSON)
            .content(
                """
                {"senhaAtual":"%s","novaSenha":"%s","codigo":"%s"}
                """
                    .formatted(senhaAtual, NOVA_SENHA, codigo)));
  }

  private String pedirCodigo(Cookie sessao) throws Exception {
    mockMvc
        .perform(post("/autenticacao/senha/token").cookie(sessao))
        .andExpect(status().isAccepted());
    ArgumentCaptor<String> codigo = ArgumentCaptor.forClass(String.class);
    verify(enviador).enviar(any(), codigo.capture());
    return codigo.getValue();
  }

  private String criarAtivo(String apelido) {
    String email = apelido + "@teste.aether.com.br";
    Instant agora = Instant.now();
    Usuario usuario = new Usuario("Teste " + apelido, email, PapelDoUsuario.GESTOR, agora);
    usuario.definirSenha(cofre.codificar(SENHA), agora);
    usuarios.saveAndFlush(usuario);
    return email;
  }

  private Cookie entrar(String email) throws Exception {
    return mockMvc
        .perform(
            post("/autenticacao/entrar")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"email":"%s","senha":"%s"}
                    """
                        .formatted(email, SENHA)))
        .andExpect(status().isOk())
        .andReturn()
        .getResponse()
        .getCookie("aether_sessao");
  }
}
