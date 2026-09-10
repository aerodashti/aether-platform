package br.com.aerodash.aether.tripulante;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("Tripulante")
class TripulanteTest {

  private static final Instant AGORA = Instant.parse("2026-09-10T12:00:00Z");
  private static final LocalDate HOJE = LocalDate.parse("2026-09-10");

  private Tripulante novo(LocalDate cma, LocalDate cht) {
    return new Tripulante(
        1L,
        new DadosDoTripulante(
            "  Marcos Vilela ",
            "11.22-33",
            FuncaoDoTripulante.COMANDANTE,
            cma,
            cht,
            new BigDecimal("8420.0"),
            " +55 11 97777-0001 ",
            " Marcos@Exemplo.com.br ",
            SituacaoDoTripulante.ATIVO),
        AGORA);
  }

  @Test
  @DisplayName("normaliza CANAC para dígitos, e-mail para minúsculas e apara o nome")
  void normalizaAoCriar() {
    Tripulante tripulante = novo(null, null);

    assertThat(tripulante.getNome()).isEqualTo("Marcos Vilela");
    assertThat(tripulante.getCanac()).isEqualTo("112233");
    assertThat(tripulante.getEmail()).isEqualTo("marcos@exemplo.com.br");
    assertThat(tripulante.getTelefone()).isEqualTo("+55 11 97777-0001");
  }

  @Test
  @DisplayName("validade nula não é vencida: é não informada")
  void nuloNaoEhVencido() {
    Tripulante semValidades = novo(null, null);

    assertThat(semValidades.possuiCmaVencido(HOJE)).isFalse();
    assertThat(semValidades.possuiChtVencido(HOJE)).isFalse();
  }

  @Test
  @DisplayName("vencido é ontem para trás; hoje ainda vale")
  void julgaVencimento() {
    Tripulante tripulante = novo(HOJE, HOJE.minusDays(1));

    assertThat(tripulante.possuiCmaVencido(HOJE)).isFalse();
    assertThat(tripulante.possuiChtVencido(HOJE)).isTrue();
  }

  @Test
  @DisplayName("atualizar troca situação e renormaliza os campos")
  void atualiza() {
    Tripulante tripulante = novo(null, null);

    tripulante.atualizar(
        new DadosDoTripulante(
            "Marcos Vilela",
            "",
            FuncaoDoTripulante.INSTRUTOR,
            null,
            null,
            null,
            "  ",
            null,
            SituacaoDoTripulante.INATIVO),
        AGORA);

    assertThat(tripulante.estaAtivo()).isFalse();
    assertThat(tripulante.getCanac()).isNull();
    assertThat(tripulante.getTelefone()).isNull();
    assertThat(tripulante.getFuncao()).isEqualTo(FuncaoDoTripulante.INSTRUTOR);
  }
}
