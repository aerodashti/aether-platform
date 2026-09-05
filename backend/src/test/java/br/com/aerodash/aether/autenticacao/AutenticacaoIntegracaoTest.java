package br.com.aerodash.aether.autenticacao;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
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
 * <p><b>Cada teste que altera um usuário cria o seu.</b> Os testes compartilham banco e contexto, e
 * nada aqui roda em transação desfeita ao fim — redefinir a senha de um usuário do seed valeria
 * para os testes seguintes, e o resultado passaria a depender da ordem em que o JUnit os executa.
 * Só {@link #seedCriaOsTresEstados()} lê o seed, e não o modifica.
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

  private static final String SEED_ATIVO = "leonardo@administraair.com.br";
  private static final String SEED_PENDENTE = "camila@administraair.com.br";
  private static final String SEED_INATIVO = "diego.furtado@administraair.com.br";
  private static final String SENHA = "aether-dev-2026";

  @Autowired private MockMvc mockMvc;
  @Autowired private UsuarioRepository usuarios;
  @Autowired private CofreDeSegredos cofre;

  /** Substitui o envio real para capturar o código de seis dígitos sorteado. */
  @MockitoBean private EnviadorDeCodigoDeRecuperacao enviador;

  @Test
  @DisplayName("o seed cria os três estados de usuário previstos pela tela")
  void seedCriaOsTresEstados() {
    assertThat(usuarios.findByEmail(SEED_ATIVO))
        .get()
        .satisfies(usuario -> assertThat(usuario.estaAtivo()).isTrue());
    assertThat(usuarios.findByEmail(SEED_PENDENTE))
        .get()
        .satisfies(usuario -> assertThat(usuario.possuiSenha()).isFalse());
    assertThat(usuarios.findByEmail(SEED_INATIVO))
        .get()
        .satisfies(usuario -> assertThat(usuario.estaAtivo()).isFalse());
  }

  @Test
  @DisplayName("entra com a senha correta e a sessão passa a responder pelo cookie")
  void entraEConsultaASessao() throws Exception {
    String email = criarAtivo("sessao");

    mockMvc
        .perform(get("/autenticacao/sessao").cookie(entrar(email, SENHA)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.nome").value("Teste sessao"))
        .andExpect(jsonPath("$.email").value(email));
  }

  @Test
  @DisplayName("sair invalida o cookie que estava funcionando")
  void sairInvalidaOCookie() throws Exception {
    Cookie sessao = entrar(criarAtivo("saida"), SENHA);

    mockMvc
        .perform(delete("/autenticacao/sessao").cookie(sessao))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(get("/autenticacao/sessao").cookie(sessao))
        .andExpect(status().isUnauthorized());
  }

  /**
   * Os usuários PENDENTE e INATIVO do seed servem aqui porque este caminho não os altera: a recusa
   * acontece antes de qualquer gravação. Só o caso da senha errada — que conta a tentativa —
   * precisa de usuário próprio.
   */
  @Test
  @DisplayName("senha errada, usuário pendente e usuário inativo recusam com a mesma resposta")
  void recusasSaoIndistinguiveis() throws Exception {
    for (String[] caso :
        new String[][] {
          {criarAtivo("recusa"), "senha-errada"},
          {SEED_PENDENTE, SENHA},
          {SEED_INATIVO, SENHA},
          {"nao-existe@exemplo.com.br", SENHA}
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

  /**
   * A contagem de falhas é gravada e só depois o método lança. Como exceção não verificada desfaz a
   * transação por padrão, sem {@code noRollbackFor} o contador voltaria a zero a cada tentativa e o
   * bloqueio nunca aconteceria. Só um teste que passa pela transação de verdade percebe isso — no
   * unitário a entidade em memória conta normalmente.
   */
  @Test
  @DisplayName("bloqueia a conta depois de cinco senhas erradas, e a senha certa também é recusada")
  void bloqueiaDepoisDeCincoFalhas() throws Exception {
    String email = criarAtivo("bloqueio");

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

  /** Usuário ativo exclusivo deste teste, para que a ordem de execução não importe. */
  private String criarAtivo(String apelido) {
    String email = apelido + "@teste.aether.com.br";
    Instant agora = Instant.now();
    Usuario usuario = new Usuario("Teste " + apelido, email, agora);
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
