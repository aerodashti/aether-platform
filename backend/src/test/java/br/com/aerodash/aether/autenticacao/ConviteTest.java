package br.com.aerodash.aether.autenticacao;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("Convite")
class ConviteTest {

  private static final Instant AGORA = Instant.parse("2026-09-04T12:00:00Z");
  private static final Duration VALIDADE = Duration.ofDays(2);

  @Test
  @DisplayName("nasce vigente e expira ao fim da validade")
  void expiraAoFimDaValidade() {
    Convite convite = novo();

    assertThat(convite.estaVigente(AGORA)).isTrue();
    assertThat(convite.estaVigente(AGORA.plus(VALIDADE).minusSeconds(1))).isTrue();
    assertThat(convite.estaVigente(AGORA.plus(VALIDADE))).isFalse();
    assertThat(convite.estaExpirado(AGORA.plus(VALIDADE))).isTrue();
  }

  @Test
  @DisplayName("usar o convite o encerra: o link não serve para uma segunda troca de senha")
  void usarEncerraOConvite() {
    Convite convite = novo();

    convite.marcarComoUsado(AGORA.plusSeconds(60));

    assertThat(convite.foiUsado()).isTrue();
    assertThat(convite.estaVigente(AGORA.plusSeconds(61))).isFalse();
  }

  @Test
  @DisplayName("marcar como usado duas vezes preserva o primeiro instante")
  void marcarDuasVezesPreservaOPrimeiro() {
    Convite convite = novo();

    convite.marcarComoUsado(AGORA.plusSeconds(60));
    convite.marcarComoUsado(AGORA.plusSeconds(600));

    assertThat(convite.foiUsado()).isTrue();
    assertThat(convite.estaVigente(AGORA.plusSeconds(61))).isFalse();
  }

  private static Convite novo() {
    Usuario usuario =
        new Usuario("Camila Nogueira", "camila@administraair.com.br", PapelDoUsuario.GESTOR, AGORA);
    return new Convite(usuario, "hash-do-token", AGORA, VALIDADE);
  }
}
