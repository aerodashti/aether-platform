package br.com.aerodash.aether.autenticacao;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
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
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * A recuperação de senha e a conclusão do convite contra um PostgreSQL de verdade: os caminhos da
 * área não logada que criam senha, com as transações e as consultas reais.
 *
 * <p><b>Cada teste que altera um usuário cria o seu.</b> Os testes compartilham banco e contexto, e
 * nada aqui roda em transação desfeita ao fim — redefinir a senha de um usuário do seed valeria
 * para os testes seguintes, e o resultado passaria a depender da ordem em que o JUnit os executa.
 *
 * <p>Exige Docker. Fica fora do {@code check}: rode com {@code ./gradlew testeIntegracao}.
 */
@Tag("integracao")
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@DisplayName("Recuperação e convite (integração)")
class RecuperacaoDeSenhaIntegracaoTest {

  @Container @ServiceConnection
  static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

  private static final String SENHA = "aether-dev-2026";

  @Autowired private MockMvc mockMvc;
  @Autowired private UsuarioRepository usuarios;
  @Autowired private CofreDeSegredos cofre;
  @Autowired private ConviteService convites;

  /** Substitui o envio real para capturar o código de seis dígitos sorteado. */
  @MockitoBean private EnviadorDeCodigoDeRecuperacao enviador;

  /** O mesmo, para o token do link do convite. */
  @MockitoBean private EnviadorDeConvite enviadorDeConvite;

  @Test
  @DisplayName("recuperação: pede o código, valida e entra com a senha nova")
  void fluxoCompletoDeRecuperacao() throws Exception {
    String email = criarAtivo("recuperacao");
    String novaSenha = "outra-senha-bem-longa";

    String codigo = pedirCodigo(email);
    assertThat(codigo).matches("\\d{6}");

    mockMvc
        .perform(
            post("/autenticacao/recuperacao/codigo")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"codigo\":\"%s\"}".formatted(email, codigo)))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(
            post("/autenticacao/recuperacao/senha")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"email\":\"%s\",\"codigo\":\"%s\",\"novaSenha\":\"%s\"}"
                        .formatted(email, codigo, novaSenha)))
        .andExpect(status().isNoContent());

    assertThat(entrar(email, novaSenha)).isNotNull();
  }

  @Test
  @DisplayName("o código queimado não redefine a senha uma segunda vez")
  void codigoUsadoNaoServeDeNovo() throws Exception {
    String email = criarAtivo("queimado");
    String corpo =
        "{\"email\":\"%s\",\"codigo\":\"%s\",\"novaSenha\":\"senha-nova-longa\"}"
            .formatted(email, pedirCodigo(email));

    mockMvc
        .perform(
            post("/autenticacao/recuperacao/senha")
                .contentType(MediaType.APPLICATION_JSON)
                .content(corpo))
        .andExpect(status().isNoContent());
    mockMvc
        .perform(
            post("/autenticacao/recuperacao/senha")
                .contentType(MediaType.APPLICATION_JSON)
                .content(corpo))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.title").value("Código inválido"));
  }

  @Test
  @DisplayName("pedir código para e-mail inexistente responde 202 e não envia nada")
  void emailInexistenteNaoEnviaCodigo() throws Exception {
    mockMvc
        .perform(
            post("/autenticacao/recuperacao")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"ninguem@exemplo.com.br\"}"))
        .andExpect(status().isAccepted());

    verify(enviador, never()).enviar(any(), any());
  }

  /** Mesma armadilha de transação do bloqueio, agora no contador de palpites do código. */
  @Test
  @DisplayName("o código morre depois de cinco palpites errados, mesmo com o valor certo em mãos")
  void codigoMorreDepoisDeCincoPalpites() throws Exception {
    String email = criarAtivo("palpites");
    String codigo = pedirCodigo(email);

    for (int palpite = 0; palpite < 5; palpite++) {
      mockMvc
          .perform(
              post("/autenticacao/recuperacao/codigo")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{\"email\":\"%s\",\"codigo\":\"000000\"}".formatted(email)))
          .andExpect(status().isBadRequest());
    }

    mockMvc
        .perform(
            post("/autenticacao/recuperacao/codigo")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"codigo\":\"%s\"}".formatted(email, codigo)))
        .andExpect(status().isBadRequest());
  }

  @Test
  @DisplayName("redefinir a senha encerra a sessão que estava aberta")
  void redefinirEncerraASessaoAberta() throws Exception {
    String email = criarAtivo("sessao-antiga");
    Cookie sessao = entrar(email, SENHA);

    redefinir(email, pedirCodigo(email), "outra-senha-bem-longa").andExpect(status().isNoContent());

    mockMvc
        .perform(get("/autenticacao/sessao").cookie(sessao))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @DisplayName("a nova senha igual à atual é recusada no campo, e o código continua valendo")
  void senhaIgualAAtualEhRecusada() throws Exception {
    String email = criarAtivo("repetida");
    String codigo = pedirCodigo(email);

    redefinir(email, codigo, SENHA)
        .andExpect(status().isBadRequest())
        .andExpect(
            jsonPath("$.campos.novaSenha").value("A nova senha precisa ser diferente da atual."));

    redefinir(email, codigo, "outra-senha-bem-longa").andExpect(status().isNoContent());
  }

  @Test
  @DisplayName("quem foi desativado depois de pedir o código não se reativa ao redefinir")
  void desativadoNaoSeReativaPeloCodigo() throws Exception {
    String email = criarAtivo("desativado-codigo");
    String codigo = pedirCodigo(email);
    desativar(email);

    redefinir(email, codigo, "outra-senha-bem-longa")
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.campos.codigo").exists());

    assertThat(usuarios.findByEmail(email))
        .get()
        .satisfies(usuario -> assertThat(usuario.estaAtivo()).isFalse());
  }

  @Test
  @DisplayName("convite: o convidado cria a senha pelo link e entra com ela")
  void convidadoCriaASenhaEEntra() throws Exception {
    String email = "convidado@teste.aether.com.br";
    String token = convidar(email);

    concluirConvite(token, "senha-do-convidado").andExpect(status().isNoContent());

    assertThat(entrar(email, "senha-do-convidado")).isNotNull();
  }

  @Test
  @DisplayName("convite de quem foi desativado é recusado e a conta continua inativa")
  void conviteDeDesativadoEhRecusado() throws Exception {
    String email = "convidado-desativado@teste.aether.com.br";
    String token = convidar(email);
    desativar(email);

    concluirConvite(token, "senha-do-convidado")
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.title").value("Convite inválido"));

    assertThat(usuarios.findByEmail(email))
        .get()
        .satisfies(usuario -> assertThat(usuario.possuiSenha()).isFalse());
  }

  /** Usuário ativo exclusivo deste teste, para que a ordem de execução não importe. */
  private String criarAtivo(String apelido) {
    String email = apelido + "@teste.aether.com.br";
    Instant agora = Instant.now();
    Usuario usuario = new Usuario("Teste " + apelido, email, PapelDoUsuario.GESTOR, agora);
    usuario.definirSenha(cofre.codificar(SENHA), agora);
    usuarios.saveAndFlush(usuario);
    return email;
  }

  /** Dispara a recuperação e devolve o código que o enviador recebeu. */
  private String pedirCodigo(String email) throws Exception {
    mockMvc
        .perform(
            post("/autenticacao/recuperacao")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\"}".formatted(email)))
        .andExpect(status().isAccepted());

    ArgumentCaptor<String> codigo = ArgumentCaptor.forClass(String.class);
    verify(enviador).enviar(any(Usuario.class), codigo.capture());
    return codigo.getValue();
  }

  private ResultActions redefinir(String email, String codigo, String novaSenha) throws Exception {
    return mockMvc.perform(
        post("/autenticacao/recuperacao/senha")
            .contentType(MediaType.APPLICATION_JSON)
            .content(
                "{\"email\":\"%s\",\"codigo\":\"%s\",\"novaSenha\":\"%s\"}"
                    .formatted(email, codigo, novaSenha)));
  }

  /** Cria o usuário PENDENTE, emite o convite e devolve o token que iria no link. */
  private String convidar(String email) {
    Instant agora = Instant.now();
    Usuario convidado =
        usuarios.saveAndFlush(new Usuario("Convidado", email, PapelDoUsuario.GESTOR, agora));
    convites.emitir(convidado, agora);

    ArgumentCaptor<String> token = ArgumentCaptor.forClass(String.class);
    verify(enviadorDeConvite).enviar(any(Usuario.class), token.capture());
    return token.getValue();
  }

  private ResultActions concluirConvite(String token, String novaSenha) throws Exception {
    return mockMvc.perform(
        post("/autenticacao/convite/senha")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"convite\":\"%s\",\"novaSenha\":\"%s\"}".formatted(token, novaSenha)));
  }

  private void desativar(String email) {
    Usuario usuario = usuarios.findByEmail(email).orElseThrow();
    usuario.desativar(Instant.now());
    usuarios.saveAndFlush(usuario);
  }

  private Cookie entrar(String email, String senha) throws Exception {
    MvcResult resultado =
        mockMvc
            .perform(
                post("/autenticacao/entrar")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"email\":\"%s\",\"senha\":\"%s\"}".formatted(email, senha)))
            .andExpect(status().isOk())
            .andReturn();

    Cookie sessao = resultado.getResponse().getCookie("aether_sessao");
    assertThat(sessao).isNotNull();
    return sessao;
  }
}
