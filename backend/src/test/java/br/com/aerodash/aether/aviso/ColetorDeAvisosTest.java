package br.com.aerodash.aether.aviso;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import br.com.aerodash.aether.aeronave.Aeronave;
import br.com.aerodash.aether.aeronave.AeronaveRepository;
import br.com.aerodash.aether.aeronave.ContadoresDaAeronave;
import br.com.aerodash.aether.aeronave.PoliticaDeVencimento;
import br.com.aerodash.aether.fechamento.FechamentoService;
import br.com.aerodash.aether.fechamento.SaldoDaAeronaveResponse;
import br.com.aerodash.aether.manutencao.DadosDaManutencao;
import br.com.aerodash.aether.manutencao.DadosDoParametro;
import br.com.aerodash.aether.manutencao.Manutencao;
import br.com.aerodash.aether.manutencao.ManutencaoRepository;
import br.com.aerodash.aether.manutencao.ParametroDeControle;
import br.com.aerodash.aether.manutencao.ParametroDeControleRepository;
import br.com.aerodash.aether.manutencao.TipoDeParametro;
import br.com.aerodash.aether.tripulante.DadosDoTripulante;
import br.com.aerodash.aether.tripulante.FuncaoDoTripulante;
import br.com.aerodash.aether.tripulante.SituacaoDoTripulante;
import br.com.aerodash.aether.tripulante.Tripulante;
import br.com.aerodash.aether.tripulante.TripulanteRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
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
@DisplayName("ColetorDeAvisos")
class ColetorDeAvisosTest {

  private static final LocalDate HOJE = LocalDate.parse("2026-10-06");
  private static final Instant AGORA = Instant.parse("2026-10-06T12:00:00Z");

  @Mock private AeronaveRepository aeronaves;
  @Mock private PoliticaDeVencimento politica;
  @Mock private ParametroDeControleRepository parametros;
  @Mock private ManutencaoRepository manutencoes;
  @Mock private TripulanteRepository tripulantes;
  @Mock private FechamentoService fechamento;

  private ColetorDeAvisos coletor;
  private Aeronave psMep;

  @BeforeEach
  void montar() {
    coletor =
        new ColetorDeAvisos(aeronaves, politica, parametros, manutencoes, tripulantes, fechamento);
    // CVA vencido há 5 dias; RETA vence em 20 (dentro dos 30 de antecedência).
    psMep =
        new Aeronave(
            "PS-MEP", "Citation XLS+", "SBSP", HOJE.minusDays(5), HOJE.plusDays(20), AGORA);
    ReflectionTestUtils.setField(psMep, "id", 1L);
    psMep.corrigirContadores(
        new ContadoresDaAeronave(
            new BigDecimal("3412.5"), 2890, BigDecimal.ZERO, null, null, null, null),
        AGORA);
    when(aeronaves.findAllByOrderByMatriculaAsc()).thenReturn(List.of(psMep));
    when(politica.diasDeAviso()).thenReturn(30);
    when(parametros.findAll()).thenReturn(List.of());
    when(manutencoes.findByStatusAndDataBeforeOrderByDataAsc(any(), any())).thenReturn(List.of());
    when(tripulantes.findAll()).thenReturn(List.of());
    when(fechamento.saldos()).thenReturn(List.of());
  }

  @Test
  @DisplayName("CVA vencido e RETA na janela viram avisos; o vencido vem primeiro")
  void documentos() {
    List<Aviso> avisos = coletor.coletar(HOJE);

    assertThat(avisos)
        .extracting(Aviso::titulo)
        .containsExactly("CVA vencido", "Seguro RETA vence em 20 dias");
    assertThat(avisos.get(0).gravidade()).isEqualTo(GravidadeDoAviso.VENCIDO);
    assertThat(avisos.get(0).chave()).isEqualTo("CVA:1:" + HOJE.minusDays(5));
    assertThat(avisos.get(1).destino()).isEqualTo("/aeronaves/1");
  }

  @Test
  @DisplayName("fora da antecedência não há aviso")
  void foraDaJanela() {
    when(politica.diasDeAviso()).thenReturn(10);

    assertThat(coletor.coletar(HOJE)).extracting(Aviso::titulo).containsExactly("CVA vencido");
  }

  @Test
  @DisplayName("parâmetro de horas estourado diz quanto passou; o regular não aparece")
  void parametros() {
    ParametroDeControle estourado =
        new ParametroDeControle(
            1L,
            new DadosDoParametro(
                "Inspeção 300 h",
                TipoDeParametro.HORAS,
                new BigDecimal("3400"),
                null,
                new BigDecimal("50")),
            AGORA);
    ReflectionTestUtils.setField(estourado, "id", 9L);
    ParametroDeControle regular =
        new ParametroDeControle(
            1L,
            new DadosDoParametro(
                "Overhaul",
                TipoDeParametro.CICLOS,
                new BigDecimal("6000"),
                null,
                new BigDecimal("100")),
            AGORA);
    when(parametros.findAll()).thenReturn(List.of(estourado, regular));

    Aviso aviso =
        coletor.coletar(HOJE).stream()
            .filter(cada -> cada.categoria() == CategoriaDoAviso.MANUTENCAO)
            .findFirst()
            .orElseThrow();
    assertThat(aviso.titulo()).isEqualTo("Limite estourado: Inspeção 300 h");
    assertThat(aviso.detalhe()).isEqualTo("Passou 12,5 h do limite.");
    assertThat(aviso.chave()).isEqualTo("PARAMETRO:9:3400");
  }

  @Test
  @DisplayName("manutenção atrasada, CHT na janela de tripulante ativo e fundo negativo")
  void demaisFontes() {
    Manutencao atrasada =
        new Manutencao(
            1L,
            new DadosDaManutencao(HOJE.minusDays(2), null, null, "Troca de pneus", null),
            AGORA);
    ReflectionTestUtils.setField(atrasada, "id", 4L);
    when(manutencoes.findByStatusAndDataBeforeOrderByDataAsc(any(), any()))
        .thenReturn(List.of(atrasada));
    Tripulante ativo = tripulante("Juliana Prates", SituacaoDoTripulante.ATIVO, 7L);
    Tripulante inativo = tripulante("Sérgio Tanaka", SituacaoDoTripulante.INATIVO, 8L);
    when(tripulantes.findAll()).thenReturn(List.of(ativo, inativo));
    when(fechamento.saldos())
        .thenReturn(
            List.of(
                new SaldoDaAeronaveResponse(
                    1L,
                    YearMonth.of(2026, 10),
                    new BigDecimal("-1250.50"),
                    BigDecimal.ZERO,
                    List.of())));

    List<String> titulos = coletor.coletar(HOJE).stream().map(Aviso::titulo).toList();

    assertThat(titulos)
        .contains(
            "Manutenção programada atrasada",
            "CHT de Juliana Prates vence em 3 dias",
            "Fundo descoberto")
        .noneMatch(titulo -> titulo.contains("Sérgio"));
  }

  private static Tripulante tripulante(String nome, SituacaoDoTripulante situacao, Long id) {
    Tripulante tripulante =
        new Tripulante(
            1L,
            new DadosDoTripulante(
                nome,
                null,
                FuncaoDoTripulante.COPILOTO,
                null,
                HOJE.plusDays(3),
                null,
                null,
                null,
                situacao),
            AGORA);
    ReflectionTestUtils.setField(tripulante, "id", id);
    return tripulante;
  }
}
