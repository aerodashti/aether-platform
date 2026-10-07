package br.com.aerodash.aether.participacao;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.Instant;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("ContratoDeParticipacao")
class ContratoDeParticipacaoTest {

  private static final Instant AGORA = Instant.parse("2026-09-10T12:00:00Z");
  private static final Instant DEPOIS = Instant.parse("2026-09-11T12:00:00Z");

  private ContratoDeParticipacao contratoCom(String... fatias) {
    ContratoDeParticipacao contrato = new ContratoDeParticipacao(1L, "Leonardo Andrade", AGORA);
    long proprietario = 1;
    for (String fatia : fatias) {
      contrato.adicionarParticipacao(proprietario++, new BigDecimal(fatia));
    }
    return contrato;
  }

  @Test
  @DisplayName("a soma fecha em 100 exatos — 99,99 não é contrato")
  void somaFechaEmCem() {
    assertThat(contratoCom("60.00", "40.00").somaFecha()).isTrue();
    assertThat(contratoCom("33.33", "33.33", "33.33").somaFecha()).isFalse();
    assertThat(contratoCom("33.34", "33.33", "33.33").somaFecha()).isTrue();
  }

  @Test
  @DisplayName("nasce vigente e encerrar marca o fim, sem apagar participações")
  void encerraSemApagar() {
    ContratoDeParticipacao contrato = contratoCom("100.00");

    assertThat(contrato.estaVigente()).isTrue();
    contrato.encerrar(DEPOIS);

    assertThat(contrato.estaVigente()).isFalse();
    assertThat(contrato.getFimDaVigencia()).isEqualTo(DEPOIS);
    assertThat(contrato.getParticipacoes()).hasSize(1);
  }

  @Test
  @DisplayName("mesmas participações em outra ordem são o mesmo contrato")
  void comparaSemOrdem() {
    ContratoDeParticipacao atual = contratoCom("60.00", "40.00");

    ContratoDeParticipacao invertido = new ContratoDeParticipacao(1L, "Outra Pessoa", DEPOIS);
    invertido.adicionarParticipacao(2L, new BigDecimal("40.00"));
    invertido.adicionarParticipacao(1L, new BigDecimal("60.0"));

    assertThat(atual.possuiAsMesmasParticipacoes(invertido.getParticipacoes())).isTrue();
  }

  @Test
  @DisplayName("percentual diferente ou proprietário diferente é outro contrato")
  void detectaMudanca() {
    ContratoDeParticipacao atual = contratoCom("60.00", "40.00");

    assertThat(atual.possuiAsMesmasParticipacoes(contratoCom("50.00", "50.00").getParticipacoes()))
        .isFalse();
    assertThat(atual.possuiAsMesmasParticipacoes(contratoCom("100.00").getParticipacoes()))
        .isFalse();
  }

  @Test
  @DisplayName("contrato sem proprietário não fecha, nem com a soma zerada")
  void contratoVazioNaoFecha() {
    assertThat(contratoCom().somaFecha()).isFalse();
  }

  @Test
  @DisplayName("o mesmo proprietário não entra duas vezes no contrato")
  void recusaProprietarioRepetido() {
    ContratoDeParticipacao contrato = contratoCom("60.00");

    assertThat(contrato.possuiParticipacaoDe(1L)).isTrue();
    assertThatThrownBy(() -> contrato.adicionarParticipacao(1L, new BigDecimal("40.00")))
        .isInstanceOf(ContratoInvalidoException.class)
        .hasMessage("Cada proprietário entra uma única vez no contrato.");
    assertThat(contrato.getParticipacoes()).hasSize(1);
  }

  @Test
  @DisplayName("participação fora de 0,01 a 100, ou com três casas, não entra no contrato")
  void recusaPercentualInvalido() {
    ContratoDeParticipacao contrato = contratoCom();

    for (String invalido : new String[] {"0.00", "-5.00", "100.01", "33.333"}) {
      assertThatThrownBy(() -> contrato.adicionarParticipacao(1L, new BigDecimal(invalido)))
          .as(invalido)
          .isInstanceOf(ContratoInvalidoException.class);
    }
    contrato.adicionarParticipacao(1L, new BigDecimal("100.000"));
    assertThat(contrato.somaFecha()).isTrue();
  }
}
