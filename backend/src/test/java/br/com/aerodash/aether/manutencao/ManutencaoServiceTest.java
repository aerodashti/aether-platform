package br.com.aerodash.aether.manutencao;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.com.aerodash.aether.aeronave.Aeronave;
import br.com.aerodash.aether.aeronave.AeronaveRepository;
import br.com.aerodash.aether.aeronave.ContadoresDaAeronave;
import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
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

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("ManutencaoService")
class ManutencaoServiceTest {

  private static final Instant AGORA = Instant.parse("2026-09-10T12:00:00Z");

  @Mock private ManutencaoRepository manutencoes;
  @Mock private ParametroDeControleRepository parametros;
  @Mock private AeronaveRepository aeronaves;
  @Mock private ContextoDaRequisicao contexto;

  private ManutencaoService service;
  private Aeronave aeronave;

  @BeforeEach
  void montar() {
    service =
        new ManutencaoService(
            manutencoes, parametros, aeronaves, Clock.fixed(AGORA, ZoneOffset.UTC), contexto);
    aeronave =
        new Aeronave(
            "PS-MEP",
            "Citation XLS+",
            "SBSP",
            LocalDate.parse("2027-01-01"),
            LocalDate.parse("2027-02-01"),
            AGORA);
    ReflectionTestUtils.setField(aeronave, "id", 1L);
    aeronave.corrigirContadores(
        new ContadoresDaAeronave(
            new BigDecimal("3412.5"), 2890, new BigDecimal("1482300"), null, null, null, null),
        AGORA);
    when(aeronaves.findById(1L)).thenReturn(Optional.of(aeronave));
    when(manutencoes.save(any())).thenAnswer(chamada -> chamada.getArgument(0));
    when(parametros.save(any())).thenAnswer(chamada -> chamada.getArgument(0));
  }

  @Test
  @DisplayName("o painel julga cada parâmetro contra os contadores atuais")
  void painelJulgado() {
    ParametroDeControle ciclos =
        new ParametroDeControle(
            1L,
            new DadosDoParametro(
                "Trem de pouso",
                TipoDeParametro.CICLOS,
                new BigDecimal("3000"),
                null,
                new BigDecimal("200")),
            AGORA);
    when(parametros.findByAeronaveIdOrderByNomeAsc(1L)).thenReturn(List.of(ciclos));
    when(manutencoes.findByAeronaveIdAndStatusOrderByDataAsc(any(), any())).thenReturn(List.of());
    when(manutencoes.findByAeronaveIdAndStatusOrderByDataDesc(any(), any())).thenReturn(List.of());

    PainelDeManutencaoResponse painel = service.painel(1L);

    assertThat(painel.horasDeCelula()).isEqualByComparingTo("3412.5");
    assertThat(painel.parametros().get(0).atual()).isEqualByComparingTo("2890");
    assertThat(painel.parametros().get(0).restante()).isEqualByComparingTo("110");
    assertThat(painel.parametros().get(0).situacao()).isEqualTo(SituacaoDoParametro.ATENCAO);
  }

  @Test
  @DisplayName("parâmetro de data sem data limite é recusado antes de salvar")
  void recusaParametroIncoerente() {
    ParametroRequest semData =
        new ParametroRequest(1L, "Pesagem", TipoDeParametro.DATA, null, null, new BigDecimal("30"));

    assertThatThrownBy(() -> service.criarParametro(semData))
        .isInstanceOf(ManutencaoInvalidaException.class);
    verify(parametros, never()).save(any());
  }

  @Test
  @DisplayName("a aeronave do evento não muda numa correção")
  void naoTrocaDeAeronave() {
    Manutencao salva =
        new Manutencao(
            1L,
            new DadosDaManutencao(LocalDate.parse("2026-09-22"), null, null, "Inspeção", null),
            AGORA);
    when(manutencoes.findById(5L)).thenReturn(Optional.of(salva));

    ManutencaoRequest deOutra =
        new ManutencaoRequest(2L, LocalDate.parse("2026-09-22"), null, null, "Inspeção", null);

    assertThatThrownBy(() -> service.atualizar(5L, deOutra))
        .isInstanceOf(ManutencaoInvalidaException.class);
  }
}
