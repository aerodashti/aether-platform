package br.com.aerodash.aether.aeronave;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.test.util.ReflectionTestUtils;

/** As três edições do detalhe: ficha, contadores e configuração financeira. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("AeronaveService — edições do detalhe")
class AeronaveServiceEdicaoTest {

  private static final Instant AGORA = Instant.parse("2026-09-10T12:00:00Z");
  private static final DetalheDaAeronaveResponse.Contadores LIDOS_DO_PS_MEP =
      new DetalheDaAeronaveResponse.Contadores(
          new BigDecimal("3412.5"), 2890, new BigDecimal("1482300"), null, null, null, null);

  @Mock private AeronaveRepository aeronaves;
  @Mock private ContextoDaRequisicao contexto;

  private AeronaveService service;
  private Aeronave aeronave;

  @BeforeEach
  void montar() {
    service =
        new AeronaveService(
            aeronaves,
            new AeronaveMapper(),
            () -> 30,
            new PendenciasDaFrota(List.of((frota, hoje, dias) -> Map.of())),
            Clock.fixed(AGORA, ZoneOffset.UTC),
            contexto);
    aeronave =
        new Aeronave(
            "PS-MEP",
            "Citation XLS+",
            "SBSP",
            LocalDate.parse("2027-01-01"),
            LocalDate.parse("2027-02-01"),
            AGORA);
    aeronave.corrigirContadores(
        new ContadoresDaAeronave(
            new BigDecimal("3412.5"), 2890, new BigDecimal("1482300"), null, null, null, null),
        AGORA);
    ReflectionTestUtils.setField(aeronave, "id", 1L);
    when(aeronaves.findById(1L)).thenReturn(Optional.of(aeronave));
  }

  private static FichaTecnicaRequest fichaComPesos(Integer decolagem, Integer pouso) {
    return new FichaTecnicaRequest(
        "", "  Pilatus PC-12 NGX ", "  ", "sbps", null, " ", decolagem, pouso);
  }

  private static ContadoresRequest correcao(DetalheDaAeronaveResponse.Contadores lidos) {
    return new ContadoresRequest(
        new BigDecimal("3500.0"), 2950, new BigDecimal("1500000"), null, null, null, null, lidos);
  }

  private static ConfiguracaoFinanceiraRequest configuracao(ModeloDeAporte modelo, String valor) {
    return new ConfiguracaoFinanceiraRequest(
        BaseDoRateio.POR_USO,
        modelo,
        1,
        valor == null ? null : new BigDecimal(valor),
        5,
        BigDecimal.ZERO);
  }

  @Test
  @DisplayName("a ficha grava os textos aparados e o opcional em branco como nulo")
  void fichaNormalizada() {
    service.atualizarFichaTecnica(1L, fichaComPesos(4740, 4500));

    assertThat(aeronave.getModelo()).isEqualTo("Pilatus PC-12 NGX");
    assertThat(aeronave.getFabricante()).isNull();
    assertThat(aeronave.getNumeroDeSerie()).isNull();
    assertThat(aeronave.getApoliceDoSeguro()).isNull();
    assertThat(aeronave.getBase()).isEqualTo("SBPS");
  }

  @Test
  @DisplayName("peso de pouso acima do de decolagem é recusado no campo do pouso")
  void pesosIncoerentes() {
    assertThatThrownBy(() -> service.atualizarFichaTecnica(1L, fichaComPesos(5670, 9999)))
        .isInstanceOf(FichaTecnicaInvalidaException.class)
        .extracting(excecao -> ((ExcecaoDeDominio) excecao).getCampo())
        .isEqualTo(Optional.of("pesoMaxPousoKg"));
    verify(contexto).decisao("aeronave.pesosCoerentes", false);
    assertThat(aeronave.getModelo()).isEqualTo("Citation XLS+");
  }

  @Test
  @DisplayName("os contadores lidos ainda são os de agora: a correção grava")
  void corrigeSobreOsTotaisLidos() {
    service.corrigirContadores(1L, correcao(LIDOS_DO_PS_MEP));

    verify(contexto).decisao("aeronave.contadoresDesatualizados", false);
    assertThat(aeronave.getContadores().ciclos()).isEqualTo(2950);
  }

  @Test
  @DisplayName("um voo somado depois da leitura recusa a correção com 409 e preserva o voo")
  void recusaCorrecaoSobreTotaisVelhos() {
    aeronave.acumularVoo(new BigDecimal("1.5"), new BigDecimal("480"), 1, AGORA);

    assertThatThrownBy(() -> service.corrigirContadores(1L, correcao(LIDOS_DO_PS_MEP)))
        .isInstanceOf(ContadoresDesatualizadosException.class);
    verify(contexto).decisao("aeronave.contadoresDesatualizados", true);
    assertThat(aeronave.getContadores().ciclos()).isEqualTo(2891);
  }

  @Test
  @DisplayName("sem os totais lidos (o cadastro) não há o que conferir")
  void semLeituraNaoConfere() {
    service.corrigirContadores(1L, correcao(null));

    assertThat(aeronave.getContadores().horasDeCelula()).isEqualByComparingTo("3500.0");
  }

  @Test
  @DisplayName("aporte fixo sem valor é recusado no campo do valor")
  void aporteFixoSemValor() {
    assertThatThrownBy(
            () ->
                service.atualizarConfiguracaoFinanceira(1L, configuracao(ModeloDeAporte.FIXO, "0")))
        .isInstanceOf(ConfiguracaoFinanceiraInvalidaException.class)
        .extracting(excecao -> ((ExcecaoDeDominio) excecao).getCampo())
        .isEqualTo(Optional.of("valorDoAporte"));
    verify(contexto).decisao("aeronave.valorDoAporteCoerente", false);
  }

  @Test
  @DisplayName("o proporcional ao uso descarta o valor do aporte")
  void proporcionalDescartaValor() {
    DetalheDaAeronaveResponse detalhe =
        service.atualizarConfiguracaoFinanceira(
            1L, configuracao(ModeloDeAporte.PROPORCIONAL_AO_USO, "85000"));

    assertThat(detalhe.configuracaoFinanceira().valorDoAporte()).isNull();
  }

  @Test
  @DisplayName("periodicidade fora da tabela é recusada no campo dela")
  void periodicidadeNoCampo() {
    ConfiguracaoFinanceiraRequest cincoMeses =
        new ConfiguracaoFinanceiraRequest(
            BaseDoRateio.POR_USO, ModeloDeAporte.FIXO, 5, BigDecimal.TEN, 1, BigDecimal.ZERO);

    assertThatThrownBy(() -> service.atualizarConfiguracaoFinanceira(1L, cincoMeses))
        .extracting(excecao -> ((ExcecaoDeDominio) excecao).getCampo())
        .isEqualTo(Optional.of("periodicidadeDoAporteMeses"));
  }

  @Test
  @DisplayName("no cadastro, a recusa da configuração aponta o caminho aninhado do campo")
  void cadastroApontaOCaminhoAninhado() {
    when(aeronaves.findByMatricula("PR-AER")).thenReturn(Optional.empty());
    CriarAeronaveRequest semValor =
        new CriarAeronaveRequest(
            "PR-AER",
            null,
            "Phenom 300E",
            null,
            "SBJD",
            null,
            null,
            null,
            null,
            LocalDate.parse("2027-06-01"),
            LocalDate.parse("2027-08-01"),
            correcao(null),
            configuracao(ModeloDeAporte.FIXO, null));

    assertThatThrownBy(() -> service.criar(semValor))
        .extracting(excecao -> ((ExcecaoDeDominio) excecao).getCampo())
        .isEqualTo(Optional.of("configuracaoFinanceira.valorDoAporte"));
    verify(aeronaves, org.mockito.Mockito.never()).save(any());
  }
}
