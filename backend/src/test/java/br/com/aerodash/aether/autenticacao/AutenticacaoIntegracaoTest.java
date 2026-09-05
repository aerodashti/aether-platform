package br.com.aerodash.aether.autenticacao;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
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
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * O fluxo inteiro da área não logada contra um PostgreSQL de verdade: migration, seed, BCrypt,
 * cookie e os três passos da recuperação.
 *
 * <p>Exige Docker. Fica fora do {@code check}: rode com {@code ./gradlew testeIntegracao}.
 */
@Tag("integracao")
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@DisplayName("Autenticação (integração)")
class AutenticacaoIntegracaoTest {

  @Container @ServiceConnection
  static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

  private static final String ATIVO = "leonardo@administraair.com.br";
  private static final String PENDENTE = "camila@administraair.com.br";
  private static final String INATIVO = "diego.furtado@administraair.com.br";
  private static final String SENHA = "aether-dev-2026";

  @Autowired private MockMvc mockMvc;
  @Autowired private UsuarioRepository usuarios;
  @Autowired private CofreDeSegredos cofre;

  /** Substitui o envio real para capturar o código de seis dígitos sorteado. */
  @MockitoBean private EnviadorDeCodigoDeRecuperacao enviador;

  @Test
  @DisplayName("o seed cria os três estados de usuário previstos pela tela")
  void seedCriaOsTresEstados() {
    assertThat(usuarios.findByEmail(ATIVO))
        .get()
        .satisfies(usuario -> assertThat(usuario.estaAtivo()).isTrue());
    assertThat(usuarios.findByEmail(PENDENTE))
        .get()
        .satisfies(usuario -> assertThat(usuario.possuiSenha()).isFalse());
    assertThat(usuarios.findByEmail(INATIVO))
        .get()
        .satisfies(usuario -> assertThat(usuario.estaAtivo()).isFalse());
  }

  @Test
  @DisplayName("entra com a senha do seed e a sessão passa a responder pelo cookie")
  void entraEConsultaASessao() throws Exception {
    Cookie sessao = entrar(ATIVO, SENHA);

    mockMvc
        .perform(get("/autenticacao/sessao").cookie(sessao))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.nome").value("Leonardo Andrade"))
        .andExpect(jsonPath("$.email").value(ATIVO));
  }

  @Test
  @DisplayName("sair invalida o cookie que estava funcionando")
  void sairInvalidaOCookie() throws Exception {
    Cookie sessao = entrar(ATIVO, SENHA);

    mockMvc
        .perform(delete("/autenticacao/sessao").cookie(sessao))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(get("/autenticacao/sessao").cookie(sessao))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @DisplayName("senha errada, usuário pendente e usuário inativo recusam com a mesma resposta")
  void recusasSaoIndistinguiveis() throws Exception {
    for (String[] caso :
        new String[][] {
          {ATIVO, "senha-errada"},
          {PENDENTE, SENHA},
          {INATIVO, SENHA},
          {"nao-existe@x.com.br", SENHA}
        }) {
      mockMvc
          .perform(
              post("/autenticacao/entrar")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{\"email\":\"%s\",\"senha\":\"%s\"}".formatted(caso[0], caso[1])))
          .andExpect(status().isUnauthorized())
          .andExpect(jsonPath("$.detail").value("E-mail ou senha incorretos."));
    }
  }

  @Test
  @DisplayName("recuperação: pede o código, valida e entra com a senha nova")
  void fluxoCompletoDeRecuperacao() throws Exception {
    String email = "patricia@administraair.com.br";
    String novaSenha = "outra-senha-bem-longa";

    mockMvc
        .perform(
            post("/autenticacao/recuperacao")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\"}".formatted(email)))
        .andExpect(status().isAccepted());

    ArgumentCaptor<String> codigo = ArgumentCaptor.forClass(String.class);
    verify(enviador).enviar(any(Usuario.class), codigo.capture());
    assertThat(codigo.getValue()).matches("\\d{6}");

    mockMvc
        .perform(
            post("/autenticacao/recuperacao/codigo")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"email\":\"%s\",\"codigo\":\"%s\"}".formatted(email, codigo.getValue())))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(
            post("/autenticacao/recuperacao/senha")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"email\":\"%s\",\"codigo\":\"%s\",\"novaSenha\":\"%s\"}"
                        .formatted(email, codigo.getValue(), novaSenha)))
        .andExpect(status().isNoContent());

    assertThat(entrar(email, novaSenha)).isNotNull();
  }

  @Test
  @DisplayName("o código queimado não redefine a senha uma segunda vez")
  void codigoUsadoNaoServeDeNovo() throws Exception {
    String email = "leonardo@administraair.com.br";

    mockMvc
        .perform(
            post("/autenticacao/recuperacao")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\"}".formatted(email)))
        .andExpect(status().isAccepted());

    ArgumentCaptor<String> codigo = ArgumentCaptor.forClass(String.class);
    verify(enviador).enviar(any(Usuario.class), codigo.capture());

    String corpo =
        "{\"email\":\"%s\",\"codigo\":\"%s\",\"novaSenha\":\"senha-nova-longa\"}"
            .formatted(email, codigo.getValue());

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

    verify(enviador, org.mockito.Mockito.never()).enviar(any(), any());
  }

  /**
   * A contagem de falhas é gravada e só depois o método lança. Como exceção não verificada desfaz a
   * transação por padrão, sem {@code noRollbackFor} o contador voltaria a zero a cada tentativa e o
   * bloqueio nunca aconteceria. Só um teste que passa pela transação de verdade percebe isso — no
   * unitário a entidade em memória "conta" normalmente.
   */
  @Test
  @DisplayName("bloqueia a conta depois de cinco senhas erradas, e a senha certa também é recusada")
  void bloqueiaDepoisDeCincoFalhas() throws Exception {
    String email = "camila.bloqueio@administraair.com.br";
    criarAtivo(email);

    for (int tentativa = 0; tentativa < 5; tentativa++) {
      mockMvc
          .perform(
              post("/autenticacao/entrar")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{\"email\":\"%s\",\"senha\":\"errada\"}".formatted(email)))
          .andExpect(status().isUnauthorized());
    }

    mockMvc
        .perform(
            post("/autenticacao/entrar")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"senha\":\"%s\"}".formatted(email, SENHA)))
        .andExpect(status().isTooManyRequests())
        .andExpect(jsonPath("$.title").value("Acesso temporariamente bloqueado"));
  }

  /** Mesma armadilha de transação do bloqueio, agora no contador de palpites do código. */
  @Test
  @DisplayName("o código morre depois de cinco palpites errados, mesmo com o valor certo em mãos")
  void codigoMorreDepoisDeCincoPalpites() throws Exception {
    String email = "rafael.codigo@administraair.com.br";
    criarAtivo(email);

    mockMvc
        .perform(
            post("/autenticacao/recuperacao")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\"}".formatted(email)))
        .andExpect(status().isAccepted());

    ArgumentCaptor<String> codigo = ArgumentCaptor.forClass(String.class);
    verify(enviador).enviar(any(Usuario.class), codigo.capture());

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
                .content(
                    "{\"email\":\"%s\",\"codigo\":\"%s\"}".formatted(email, codigo.getValue())))
        .andExpect(status().isBadRequest());
  }

  /**
   * Usuário próprio do teste: os do seed são compartilhados e o bloqueio contaminaria os demais.
   */
  private void criarAtivo(String email) {
    Usuario usuario = new Usuario("Teste", email, Instant.now());
    usuario.definirSenha(cofre.codificar(SENHA), Instant.now());
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
