package br.com.aerodash.aether.aeronave;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.time.LocalDate;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

@DisplayName("Aeronave")
class AeronaveTest {

  private static final Instant AGORA = Instant.parse("2026-09-09T12:00:00Z");
  private static final LocalDate HOJE = LocalDate.of(2026, 9, 9);
  private static final int ATENCAO = 30;

  @Test
  @DisplayName("normaliza matrícula e base para maiúsculas, sem espaços nas pontas")
  void normalizaIdentificadores() {
    Aeronave nova = com(HOJE.plusMonths(8), HOJE.plusMonths(10), " ps-mep ", " sbsp ");

    assertThat(nova.getMatricula()).isEqualTo("PS-MEP");
    assertThat(nova.getBase()).isEqualTo("SBSP");
    assertThat(Aeronave.normalizarMatricula(null)).isNull();
    assertThat(Aeronave.normalizarBase(null)).isNull();
  }

  @Test
  @DisplayName("a situação é o elo mais fraco: o documento que vence primeiro governa")
  void oDocumentoQueVencePrimeiroGoverna() {
    // CVA longe, RETA perto: quem manda é a RETA.
    Aeronave aeronave = com(HOJE.plusMonths(5), HOJE.plusDays(12));

    assertThat(aeronave.documentoDoProximoVencimento()).isEqualTo(DocumentoDaAeronave.RETA);
    assertThat(aeronave.proximoVencimento()).isEqualTo(HOJE.plusDays(12));
    assertThat(aeronave.situacaoRegular(HOJE, ATENCAO)).isEqualTo(SituacaoRegular.ATENCAO);
  }

  @Test
  @DisplayName("longe do vencimento é REGULAR")
  void longeDoVencimentoEhRegular() {
    Aeronave aeronave = com(HOJE.plusMonths(8), HOJE.plusMonths(10));

    assertThat(aeronave.situacaoRegular(HOJE, ATENCAO)).isEqualTo(SituacaoRegular.REGULAR);
    assertThat(aeronave.podeVoar(HOJE)).isTrue();
  }

  @Test
  @DisplayName("a janela de atenção inclui o próprio limiar, e o dia seguinte já é REGULAR")
  void aJanelaDeAtencaoIncluiOLimiar() {
    assertThat(com(HOJE.plusDays(30), HOJE.plusYears(1)).situacaoRegular(HOJE, ATENCAO))
        .isEqualTo(SituacaoRegular.ATENCAO);
    assertThat(com(HOJE.plusDays(31), HOJE.plusYears(1)).situacaoRegular(HOJE, ATENCAO))
        .isEqualTo(SituacaoRegular.REGULAR);
  }

  @Test
  @DisplayName("vencer hoje ainda é atenção; vencer ontem é VENCIDO")
  void oDiaDoVencimentoAindaVale() {
    Aeronave vencendoHoje = com(HOJE, HOJE.plusYears(1));
    Aeronave vencidaOntem = com(HOJE.minusDays(1), HOJE.plusYears(1));

    assertThat(vencendoHoje.situacaoRegular(HOJE, ATENCAO)).isEqualTo(SituacaoRegular.ATENCAO);
    assertThat(vencendoHoje.podeVoar(HOJE)).isTrue();

    assertThat(vencidaOntem.situacaoRegular(HOJE, ATENCAO)).isEqualTo(SituacaoRegular.VENCIDO);
    assertThat(vencidaOntem.podeVoar(HOJE)).isFalse();
  }

  @Test
  @DisplayName("os dias são um eixo só: negativo quando o vencimento já passou")
  void osDiasSaoUmEixoSo() {
    assertThat(com(HOJE.plusDays(12), HOJE.plusYears(1)).diasAteOProximoVencimento(HOJE))
        .isEqualTo(12);
    assertThat(com(HOJE.minusDays(3), HOJE.plusYears(1)).diasAteOProximoVencimento(HOJE))
        .isEqualTo(-3);
  }

  @Test
  @DisplayName("a janela é política, não norma: mudá-la muda a situação sem tocar no dado")
  void aJanelaEhPolitica() {
    Aeronave aeronave = com(HOJE.plusDays(45), HOJE.plusYears(1));

    assertThat(aeronave.situacaoRegular(HOJE, 30)).isEqualTo(SituacaoRegular.REGULAR);
    assertThat(aeronave.situacaoRegular(HOJE, 90)).isEqualTo(SituacaoRegular.ATENCAO);
  }

  @Test
  @DisplayName("atualizar o vencimento devolve a aeronave ao ar")
  void renovarDevolveAoAr() {
    Aeronave aeronave = com(HOJE.minusDays(3), HOJE.plusYears(1));
    assertThat(aeronave.podeVoar(HOJE)).isFalse();

    aeronave.atualizarVencimentos(HOJE.plusYears(1), HOJE.plusYears(1), AGORA);

    assertThat(aeronave.podeVoar(HOJE)).isTrue();
    assertThat(aeronave.situacaoRegular(HOJE, ATENCAO)).isEqualTo(SituacaoRegular.REGULAR);
  }

  private static Aeronave com(LocalDate cva, LocalDate reta) {
    return com(cva, reta, "PS-MEP", "SBSP");
  }

  private static Aeronave com(LocalDate cva, LocalDate reta, String matricula, String base) {
    return new Aeronave(matricula, "Cessna Citation XLS+", base, cva, reta, AGORA);
  }

  @Nested
  @DisplayName("ficha técnica e configuração")
  class FichaEConfiguracao {

    private static final java.time.Instant MOMENTO =
        java.time.Instant.parse("2026-09-10T12:00:00Z");

    @Test
    @DisplayName("nasce com contadores zerados e configuração padrão")
    void nasceComPadroes() {
      Aeronave aeronave =
          new Aeronave(
              "PS-MEP",
              "Citation XLS+",
              "SBSP",
              java.time.LocalDate.parse("2027-01-01"),
              java.time.LocalDate.parse("2027-02-01"),
              MOMENTO);

      assertThat(aeronave.getContadores()).isEqualTo(ContadoresDaAeronave.zerados());
      assertThat(aeronave.getConfiguracaoFinanceira()).isEqualTo(ConfiguracaoFinanceira.padrao());
    }

    @Test
    @DisplayName("atualizar a ficha normaliza a base e preserva a matrícula")
    void atualizaFicha() {
      Aeronave aeronave =
          new Aeronave(
              "PS-MEP",
              "Citation XLS+",
              "SBSP",
              java.time.LocalDate.parse("2027-01-01"),
              java.time.LocalDate.parse("2027-02-01"),
              MOMENTO);

      aeronave.atualizarFichaTecnica(
          new Aeronave.FichaTecnica(
              "Cessna", "Citation XLS+", "560-6321", "sbjd", "Hangar 7", "RETA-1"),
          MOMENTO);

      assertThat(aeronave.getBase()).isEqualTo("SBJD");
      assertThat(aeronave.getMatricula()).isEqualTo("PS-MEP");
      assertThat(aeronave.getFabricante()).isEqualTo("Cessna");
    }

    @Test
    @DisplayName("contadores negativos são detectados em qualquer campo, nulos ignorados")
    void contadoresNegativos() {
      assertThat(ContadoresDaAeronave.zerados().possuiValoresNegativos()).isFalse();
      assertThat(
              new ContadoresDaAeronave(
                      java.math.BigDecimal.ONE,
                      0,
                      java.math.BigDecimal.ZERO,
                      null,
                      java.math.BigDecimal.valueOf(-1),
                      null)
                  .possuiValoresNegativos())
          .isTrue();
    }

    @Test
    @DisplayName("periodicidade fora da tabela e dia 29 não passam")
    void configuracaoInvalida() {
      ConfiguracaoFinanceira meses5 =
          new ConfiguracaoFinanceira(BaseDoRateio.POR_USO, ModeloDeAporte.FIXO, 5, null, 1);
      ConfiguracaoFinanceira dia29 =
          new ConfiguracaoFinanceira(BaseDoRateio.POR_USO, ModeloDeAporte.FIXO, 1, null, 29);

      assertThat(meses5.possuiPeriodicidadeValida()).isFalse();
      assertThat(dia29.possuiDiaDeFechamentoValido()).isFalse();
      assertThat(ConfiguracaoFinanceira.padrao().possuiPeriodicidadeValida()).isTrue();
      assertThat(ConfiguracaoFinanceira.padrao().possuiDiaDeFechamentoValido()).isTrue();
    }
  }
}
