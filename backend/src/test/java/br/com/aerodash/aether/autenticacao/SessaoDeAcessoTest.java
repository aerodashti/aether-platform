package br.com.aerodash.aether.autenticacao;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("SessaoDeAcesso")
class SessaoDeAcessoTest {

  private static final Instant AGORA = Instant.parse("2026-09-04T12:00:00Z");
  private static final Duration DURACAO = Duration.ofHours(12);

  @Test
  @DisplayName("vale até o instante de expiração, exclusive")
  void valeAteExpirar() {
    SessaoDeAcesso sessao = nova();

    assertThat(sessao.estaVigente(AGORA)).isTrue();
    assertThat(sessao.estaVigente(AGORA.plus(DURACAO).minusSeconds(1))).isTrue();
    assertThat(sessao.estaVigente(AGORA.plus(DURACAO))).isFalse();
  }

  @Test
  @DisplayName("encerrar corta a sessão mesmo dentro do prazo")
  void encerrarCortaAntesDoPrazo() {
    SessaoDeAcesso sessao = nova();

    sessao.encerrar(AGORA.plusSeconds(60));

    assertThat(sessao.estaEncerrada()).isTrue();
    assertThat(sessao.estaVigente(AGORA.plusSeconds(61))).isFalse();
  }

  @Test
  @DisplayName("encerrar duas vezes preserva o primeiro momento — sair de novo não é erro")
  void encerrarEIdempotente() {
    SessaoDeAcesso sessao = nova();

    sessao.encerrar(AGORA.plusSeconds(60));
    sessao.encerrar(AGORA.plusSeconds(600));

    assertThat(sessao.estaEncerrada()).isTrue();
    assertThat(sessao.estaVigente(AGORA.plusSeconds(61))).isFalse();
  }

  private static SessaoDeAcesso nova() {
    Usuario usuario = new Usuario("Leonardo", "leonardo@administraair.com.br", AGORA);
    usuario.definirSenha("$2a$12$hash", AGORA);
    return new SessaoDeAcesso(usuario, "resumo-do-token", AGORA, DURACAO);
  }
}
