package br.com.aerodash.aether.autenticacao;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("Usuario")
class UsuarioTest {

  private static final Instant AGORA = Instant.parse("2026-09-04T12:00:00Z");
  private static final Duration BLOQUEIO = Duration.ofMinutes(15);
  private static final int LIMITE = 5;

  @Test
  @DisplayName("nasce pendente e sem senha — quem cria a senha é a própria pessoa")
  void nascePendenteESemSenha() {
    Usuario novo = new Usuario("Camila Nogueira", "camila@administraair.com.br", AGORA);

    assertThat(novo.getSituacao()).isEqualTo(SituacaoDoUsuario.PENDENTE);
    assertThat(novo.possuiSenha()).isFalse();
    assertThat(novo.estaAtivo()).isFalse();
    assertThat(novo.podeEntrar(AGORA)).isFalse();
  }

  @Test
  @DisplayName("normaliza o e-mail para minúsculas e sem espaços nas pontas")
  void normalizaOEmail() {
    Usuario novo = new Usuario("Leonardo", "  Leonardo@AdministraAir.com.BR ", AGORA);

    assertThat(novo.getEmail()).isEqualTo("leonardo@administraair.com.br");
    assertThat(Usuario.normalizarEmail(null)).isNull();
  }

  @Test
  @DisplayName("definir a senha ativa o usuário")
  void definirSenhaAtiva() {
    Usuario usuario = pendente();

    usuario.definirSenha("$2a$12$hash", AGORA);

    assertThat(usuario.estaAtivo()).isTrue();
    assertThat(usuario.possuiSenha()).isTrue();
    assertThat(usuario.podeEntrar(AGORA)).isTrue();
    assertThat(usuario.getSenha()).contains("$2a$12$hash");
  }

  @Test
  @DisplayName("bloqueia a conta ao atingir o limite de falhas e zera a contagem")
  void bloqueiaNoLimiteDeFalhas() {
    Usuario usuario = ativo();

    for (int tentativa = 1; tentativa < LIMITE; tentativa++) {
      usuario.registrarFalhaDeEntrada(AGORA, LIMITE, BLOQUEIO);
      assertThat(usuario.estaBloqueado(AGORA)).isFalse();
    }
    usuario.registrarFalhaDeEntrada(AGORA, LIMITE, BLOQUEIO);

    assertThat(usuario.estaBloqueado(AGORA)).isTrue();
    assertThat(usuario.podeEntrar(AGORA)).isFalse();
    assertThat(usuario.getTentativas()).isZero();
    assertThat(usuario.getBloqueadoAte()).contains(AGORA.plus(BLOQUEIO));
  }

  @Test
  @DisplayName("o bloqueio termina sozinho quando o prazo passa")
  void bloqueioExpiraComOTempo() {
    Usuario usuario = ativo();
    for (int tentativa = 0; tentativa < LIMITE; tentativa++) {
      usuario.registrarFalhaDeEntrada(AGORA, LIMITE, BLOQUEIO);
    }

    assertThat(usuario.estaBloqueado(AGORA.plus(BLOQUEIO).minusSeconds(1))).isTrue();
    assertThat(usuario.estaBloqueado(AGORA.plus(BLOQUEIO))).isFalse();
    assertThat(usuario.podeEntrar(AGORA.plus(BLOQUEIO))).isTrue();
  }

  @Test
  @DisplayName("entrar com sucesso zera tentativas e libera o bloqueio")
  void entrarLimpaOEstadoDeFalha() {
    Usuario usuario = ativo();
    usuario.registrarFalhaDeEntrada(AGORA, LIMITE, BLOQUEIO);

    usuario.registrarEntrada(AGORA);

    assertThat(usuario.getTentativas()).isZero();
    assertThat(usuario.getBloqueadoAte()).isEmpty();
  }

  @Test
  @DisplayName("redefinir a senha destranca a conta de quem provou ter o e-mail")
  void redefinirSenhaDestrancaAConta() {
    Usuario usuario = ativo();
    for (int tentativa = 0; tentativa < LIMITE; tentativa++) {
      usuario.registrarFalhaDeEntrada(AGORA, LIMITE, BLOQUEIO);
    }

    usuario.definirSenha("$2a$12$nova", AGORA);

    assertThat(usuario.estaBloqueado(AGORA)).isFalse();
    assertThat(usuario.podeEntrar(AGORA)).isTrue();
  }

  @Test
  @DisplayName("só recupera a senha quem está ativo — pendente usa o link do convite")
  void somenteAtivoRecuperaSenha() {
    assertThat(ativo().podeRecuperarSenha()).isTrue();
    assertThat(pendente().podeRecuperarSenha()).isFalse();
  }

  private static Usuario pendente() {
    return new Usuario("Camila Nogueira", "camila@administraair.com.br", AGORA);
  }

  private static Usuario ativo() {
    Usuario usuario = new Usuario("Leonardo Andrade", "leonardo@administraair.com.br", AGORA);
    usuario.definirSenha("$2a$12$hash", AGORA);
    return usuario;
  }
}
