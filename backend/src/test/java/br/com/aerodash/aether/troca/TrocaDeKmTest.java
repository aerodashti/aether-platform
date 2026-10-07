package br.com.aerodash.aether.troca;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("TrocaDeKm")
class TrocaDeKmTest {

  private static final Instant AGORA = Instant.parse("2026-10-06T12:00:00Z");
  private static final long RICARDO = 1L;
  private static final long VETOR = 2L;
  private static final long HELENA = 3L;

  private static TrocaDeKm troca(Long cedente, Long recebedor, String valorPorHora) {
    return new TrocaDeKm(
        1L,
        new DadosDaTroca(
            LocalDate.parse("2026-09-20"),
            cedente,
            recebedor,
            new BigDecimal("2.5"),
            new BigDecimal("1320.0"),
            valorPorHora == null ? null : new BigDecimal(valorPorHora),
            "  ",
            " Vetor voou na cota do Ricardo "),
        AGORA);
  }

  private static TrocaDeKm trocaEm(String data) {
    return new TrocaDeKm(
        1L,
        new DadosDaTroca(
            LocalDate.parse(data),
            RICARDO,
            VETOR,
            new BigDecimal("2.5"),
            null,
            null,
            " rv-2026-041 ",
            null),
        AGORA);
  }

  @Test
  @DisplayName("nasce pendente: quem recebeu deve as horas, quem cedeu tem a receber")
  void horasADevolver() {
    TrocaDeKm troca = troca(RICARDO, VETOR, null);

    assertThat(troca.getSituacao()).isEqualTo(SituacaoDaTroca.PENDENTE);
    assertThat(troca.horasADevolverPor(VETOR)).isEqualByComparingTo("2.5");
    assertThat(troca.horasADevolverPor(RICARDO)).isEqualByComparingTo("-2.5");
    assertThat(troca.horasADevolverPor(HELENA)).isEqualByComparingTo("0");
    assertThat(troca.getRelatorioDeVoo()).isNull();
    assertThat(troca.getObservacao()).isEqualTo("Vetor voou na cota do Ricardo");
  }

  @Test
  @DisplayName("concluída não deve mais nada; reabrir devolve a pendência e apaga a data")
  void concluirEReabrir() {
    TrocaDeKm troca = troca(RICARDO, VETOR, null);

    troca.concluir(LocalDate.parse("2026-10-01"), AGORA);
    troca.concluir(LocalDate.parse("2026-10-05"), AGORA);
    assertThat(troca.getConcluidaEm()).isEqualTo(LocalDate.parse("2026-10-01"));
    assertThat(troca.horasADevolverPor(VETOR)).isEqualByComparingTo("0");

    troca.reabrir(AGORA);
    assertThat(troca.getConcluidaEm()).isNull();
    assertThat(troca.horasADevolverPor(VETOR)).isEqualByComparingTo("2.5");
  }

  @Test
  @DisplayName("o valor total é horas × R$/hora, e não existe sem valor combinado")
  void valorTotal() {
    assertThat(troca(RICARDO, VETOR, "14800.00").valorTotal()).isEqualByComparingTo("37000.00");
    assertThat(troca(RICARDO, VETOR, null).valorTotal()).isNull();
  }

  @Test
  @DisplayName("ceder a si mesmo não é troca")
  void mesmoProprietario() {
    assertThat(troca(RICARDO, RICARDO, null).ehEntreProprietariosDiferentes()).isFalse();
  }

  @Test
  @DisplayName("o Rel. Voo vai em maiúsculas e sem espaços, como no custo e no trecho")
  void relatorioDeVooNormalizado() {
    assertThat(trocaEm("2026-09-20").getRelatorioDeVoo()).isEqualTo("RV-2026-041");
  }

  @Test
  @DisplayName("a data vai de 01/01/2000 até hoje: a troca registra horas já voadas")
  void dataAceitavel() {
    LocalDate hoje = LocalDate.parse("2026-10-06");

    assertThat(trocaEm("2000-01-01").possuiDataAceitavel(hoje)).isTrue();
    assertThat(trocaEm("2026-10-06").possuiDataAceitavel(hoje)).isTrue();
    assertThat(trocaEm("1999-12-31").possuiDataAceitavel(hoje)).isFalse();
    assertThat(trocaEm("2026-10-07").possuiDataAceitavel(hoje)).isFalse();
  }

  @Test
  @DisplayName("a devolução fica entre a data da troca e hoje")
  void devolucaoEntreATrocaEHoje() {
    TrocaDeKm troca = trocaEm("2026-09-20");
    LocalDate hoje = LocalDate.parse("2026-10-06");

    assertThat(troca.podeSerDevolvidaEm(LocalDate.parse("2026-09-20"), hoje)).isTrue();
    assertThat(troca.podeSerDevolvidaEm(hoje, hoje)).isTrue();
    assertThat(troca.podeSerDevolvidaEm(LocalDate.parse("2026-09-19"), hoje)).isFalse();
    assertThat(troca.podeSerDevolvidaEm(LocalDate.parse("2026-10-07"), hoje)).isFalse();
  }

  @Test
  @DisplayName("corrigir a data de uma concluída para depois da devolução fica incoerente")
  void devolucaoCoerente() {
    TrocaDeKm troca = trocaEm("2026-09-20");
    assertThat(troca.possuiDevolucaoCoerente()).isTrue();

    troca.concluir(LocalDate.parse("2026-10-03"), AGORA);
    assertThat(troca.possuiDevolucaoCoerente()).isTrue();

    troca.atualizar(
        new DadosDaTroca(
            LocalDate.parse("2026-10-05"),
            RICARDO,
            VETOR,
            new BigDecimal("2.5"),
            null,
            null,
            null,
            null),
        AGORA);
    assertThat(troca.possuiDevolucaoCoerente()).isFalse();
  }
}
