package br.com.aerodash.aether.aeronave;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("AeronaveService")
class AeronaveServiceTest {

  private static final Instant AGORA = Instant.parse("2026-09-10T12:00:00Z");

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
    when(aeronaves.findById(1L)).thenReturn(Optional.of(aeronave));
  }

  @Test
  @DisplayName("o detalhe traz ficha, contadores e configuração juntos")
  void detalheCompleto() {
    DetalheDaAeronaveResponse detalhe = service.buscar(1L);

    assertThat(detalhe.matricula()).isEqualTo("PS-MEP");
    assertThat(detalhe.contadores().ciclos()).isZero();
    assertThat(detalhe.configuracaoFinanceira().diaDeFechamento()).isEqualTo(1);
  }

  @Test
  @DisplayName("corrigir contadores grava os novos totais")
  void corrigeContadores() {
    DetalheDaAeronaveResponse detalhe =
        service.corrigirContadores(
            1L,
            new ContadoresRequest(
                new BigDecimal("3412.5"), 2890, new BigDecimal("1482300"), null, null, null, null));

    assertThat(detalhe.contadores().horasDeCelula()).isEqualByComparingTo("3412.5");
    assertThat(aeronave.getContadores().ciclos()).isEqualTo(2890);
  }

  @Test
  @DisplayName("periodicidade fora da tabela é recusada com a lista do que vale")
  void recusaPeriodicidadeInvalida() {
    assertThatThrownBy(
            () ->
                service.atualizarConfiguracaoFinanceira(
                    1L,
                    new ConfiguracaoFinanceiraRequest(
                        BaseDoRateio.POR_USO, ModeloDeAporte.FIXO, 5, null, 1)))
        .isInstanceOf(ConfiguracaoFinanceiraInvalidaException.class)
        .hasMessageContaining("1, 2, 3, 4, 6 ou 12");
  }

  @Test
  @DisplayName("atualizar a ficha não mexe na matrícula nem nos vencimentos")
  void atualizaFicha() {
    service.atualizarFichaTecnica(
        1L,
        new FichaTecnicaRequest(
            "Cessna", "Citation XLS+", "560-6321", "SBJD", null, null, null, null));

    assertThat(aeronave.getMatricula()).isEqualTo("PS-MEP");
    assertThat(aeronave.getBase()).isEqualTo("SBJD");
    assertThat(aeronave.getVencimentoCva()).isEqualTo(LocalDate.parse("2027-01-01"));
  }

  private CriarAeronaveRequest cadastro(String matricula) {
    return new CriarAeronaveRequest(
        matricula,
        "Embraer",
        "Phenom 300E",
        "50500123",
        "sbjd",
        "Hangar 2",
        "RETA-1",
        8150,
        7650,
        LocalDate.parse("2027-06-01"),
        LocalDate.parse("2027-08-01"),
        new ContadoresRequest(
            new BigDecimal("1200.0"), 950, new BigDecimal("510000"), null, null, null, null),
        new ConfiguracaoFinanceiraRequest(
            BaseDoRateio.POR_PROPRIEDADE, ModeloDeAporte.FIXO, 1, new BigDecimal("60000"), 5));
  }

  @Test
  @DisplayName("cria normalizando matrícula e base, com ficha e configuração num ato só")
  void criaCompleta() {
    when(aeronaves.findByMatricula("PR-AER")).thenReturn(java.util.Optional.empty());
    when(aeronaves.save(org.mockito.ArgumentMatchers.any()))
        .thenAnswer(chamada -> chamada.getArgument(0));

    DetalheDaAeronaveResponse criada = service.criar(cadastro("pr-aer"));

    assertThat(criada.matricula()).isEqualTo("PR-AER");
    assertThat(criada.base()).isEqualTo("SBJD");
    assertThat(criada.pesoMaxDecolagemKg()).isEqualTo(8150);
    assertThat(criada.contadores().horasDeCelula()).isEqualByComparingTo("1200.0");
    assertThat(criada.configuracaoFinanceira().baseDoRateio())
        .isEqualTo(BaseDoRateio.POR_PROPRIEDADE);
  }

  @Test
  @DisplayName("matrícula repetida é 409, antes de salvar")
  void recusaMatriculaDuplicada() {
    when(aeronaves.findByMatricula("PS-MEP")).thenReturn(java.util.Optional.of(aeronave));

    assertThatThrownBy(() -> service.criar(cadastro("ps-mep")))
        .isInstanceOf(MatriculaJaCadastradaException.class);
    org.mockito.Mockito.verify(aeronaves, org.mockito.Mockito.never())
        .save(org.mockito.ArgumentMatchers.any());
  }
}
