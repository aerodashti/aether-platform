package br.com.aerodash.aether.autenticacao;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("CodigoDeRecuperacao")
class CodigoDeRecuperacaoTest {

  private static final Instant AGORA = Instant.parse("2026-09-04T12:00:00Z");
  private static final Duration VALIDADE = Duration.ofMinutes(10);
  private static final Duration INTERVALO = Duration.ofMinutes(1);
  private static final int LIMITE = 5;

  @Test
  @DisplayName("está vigente enquanto não expira, não é usado e sobra tentativa")
  void vigenteNasTresCondicoes() {
    assertThat(novo().estaVigente(AGORA, LIMITE)).isTrue();
  }

  @Test
  @DisplayName("expira exatamente no fim da janela de validade")
  void expiraNoFimDaJanela() {
    CodigoDeRecuperacao codigo = novo();

    assertThat(codigo.estaExpirado(AGORA.plus(VALIDADE).minusSeconds(1))).isFalse();
    assertThat(codigo.estaExpirado(AGORA.plus(VALIDADE))).isTrue();
    assertThat(codigo.estaVigente(AGORA.plus(VALIDADE), LIMITE)).isFalse();
  }

  @Test
  @DisplayName("morre depois de esgotar as tentativas — é o que torna seis dígitos suficiente")
  void morreAoEsgotarTentativas() {
    CodigoDeRecuperacao codigo = novo();

    for (int tentativa = 0; tentativa < LIMITE; tentativa++) {
      assertThat(codigo.estaVigente(AGORA, LIMITE)).isTrue();
      codigo.registrarTentativa();
    }

    assertThat(codigo.excedeuTentativas(LIMITE)).isTrue();
    assertThat(codigo.estaVigente(AGORA, LIMITE)).isFalse();
  }

  @Test
  @DisplayName("vale uma vez só")
  void valeUmaVezSo() {
    CodigoDeRecuperacao codigo = novo();

    codigo.marcarComoUsado(AGORA);

    assertThat(codigo.foiUsado()).isTrue();
    assertThat(codigo.estaVigente(AGORA, LIMITE)).isFalse();
  }

  @Test
  @DisplayName("segura o reenvio até o intervalo mínimo passar")
  void seguraOReenvio() {
    CodigoDeRecuperacao codigo = novo();

    assertThat(codigo.permiteNovoEnvio(AGORA, INTERVALO)).isFalse();
    assertThat(codigo.permiteNovoEnvio(AGORA.plus(INTERVALO).minusSeconds(1), INTERVALO)).isFalse();
    assertThat(codigo.permiteNovoEnvio(AGORA.plus(INTERVALO), INTERVALO)).isTrue();
  }

  private static CodigoDeRecuperacao novo() {
    Usuario usuario = new Usuario("Leonardo", "leonardo@administraair.com.br", AGORA);
    usuario.definirSenha("$2a$12$hash", AGORA);
    return new CodigoDeRecuperacao(usuario, "$2a$12$codigo", AGORA, VALIDADE);
  }
}
