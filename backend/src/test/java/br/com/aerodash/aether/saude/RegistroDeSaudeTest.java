package br.com.aerodash.aether.saude;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("RegistroDeSaude")
class RegistroDeSaudeTest {

  private static final Instant AGORA = Instant.parse("2026-09-04T12:00:00Z");

  @Test
  @DisplayName("está operante apenas quando a situação é OPERANTE")
  void estaOperanteSoNaSituacaoOperante() {
    assertThat(registro(SituacaoDeSaude.OPERANTE, AGORA).estaOperante()).isTrue();
    assertThat(registro(SituacaoDeSaude.DEGRADADO, AGORA).estaOperante()).isFalse();
    assertThat(registro(SituacaoDeSaude.INDISPONIVEL, AGORA).estaOperante()).isFalse();
  }

  @Test
  @DisplayName("considera recente a verificação dentro da janela de cinco minutos")
  void possuiVerificacaoRecenteDentroDaJanela() {
    RegistroDeSaude dentro = registro(SituacaoDeSaude.OPERANTE, AGORA.minusSeconds(4 * 60 + 59));
    RegistroDeSaude fora = registro(SituacaoDeSaude.OPERANTE, AGORA.minusSeconds(5 * 60 + 1));

    assertThat(dentro.possuiVerificacaoRecente(AGORA)).isTrue();
    assertThat(fora.possuiVerificacaoRecente(AGORA)).isFalse();
  }

  @Test
  @DisplayName("só é saudável quando está operante e foi verificado há pouco")
  void estaSaudavelExigeAsDuasCondicoes() {
    assertThat(registro(SituacaoDeSaude.OPERANTE, AGORA).estaSaudavel(AGORA)).isTrue();
    assertThat(registro(SituacaoDeSaude.DEGRADADO, AGORA).estaSaudavel(AGORA)).isFalse();
    assertThat(registro(SituacaoDeSaude.OPERANTE, AGORA.minusSeconds(600)).estaSaudavel(AGORA))
        .isFalse();
  }

  @Test
  @DisplayName("registrar verificação sobrescreve situação e momento")
  void registrarVerificacaoAtualizaOEstado() {
    RegistroDeSaude registro = registro(SituacaoDeSaude.INDISPONIVEL, AGORA.minusSeconds(3600));

    registro.registrarVerificacao(SituacaoDeSaude.OPERANTE, AGORA);

    assertThat(registro.getSituacao()).isEqualTo(SituacaoDeSaude.OPERANTE);
    assertThat(registro.getVerificadoEm()).isEqualTo(AGORA);
    assertThat(registro.estaSaudavel(AGORA)).isTrue();
  }

  private static RegistroDeSaude registro(SituacaoDeSaude situacao, Instant verificadoEm) {
    return new RegistroDeSaude("banco", situacao, verificadoEm);
  }
}
