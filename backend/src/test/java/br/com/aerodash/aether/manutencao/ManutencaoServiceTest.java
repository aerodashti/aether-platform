package br.com.aerodash.aether.manutencao;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.com.aerodash.aether.aeronave.Aeronave;
import br.com.aerodash.aether.aeronave.AeronaveRepository;
import br.com.aerodash.aether.aeronave.ContadoresDaAeronave;
import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
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
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("ManutencaoService")
class ManutencaoServiceTest {

  private static final Instant AGORA = Instant.parse("2026-09-10T12:00:00Z");
  private static final LocalDate HOJE = LocalDate.parse("2026-09-10");

  @Mock private ManutencaoRepository manutencoes;
  @Mock private ParametroDeControleRepository parametros;
  @Mock private AeronaveRepository aeronaves;
  @Mock private ContextoDaRequisicao contexto;

  private ManutencaoService service;

  @BeforeEach
  void montar() {
    service =
        new ManutencaoService(
            manutencoes,
            parametros,
            aeronaves,
            new InvariantesDoParametro(parametros, contexto),
            Clock.fixed(AGORA, ZoneOffset.UTC),
            contexto);
    Aeronave aeronave =
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

  private static ManutencaoRequest pedidoPara(LocalDate data) {
    return new ManutencaoRequest(1L, data, null, null, "Inspeção", null);
  }

  private Manutencao salvaComId(LocalDate data) {
    Manutencao salva =
        new Manutencao(1L, new DadosDaManutencao(data, null, null, "Inspeção", null), AGORA);
    when(manutencoes.findById(5L)).thenReturn(Optional.of(salva));
    return salva;
  }

  private static ParametroRequest parametro(
      TipoDeParametro tipo, String limite, LocalDate dataLimite, String aviso) {
    return new ParametroRequest(
        1L,
        "Inspeção de célula",
        tipo,
        limite == null ? null : new BigDecimal(limite),
        dataLimite,
        new BigDecimal(aviso));
  }

  private static void recusadoNoCampo(Runnable chamada, String campo) {
    assertThatThrownBy(chamada::run)
        .isInstanceOf(ManutencaoInvalidaException.class)
        .extracting(excecao -> ((ExcecaoDeDominio) excecao).getCampo())
        .isEqualTo(Optional.of(campo));
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
    when(manutencoes.findByAeronaveIdAndStatusOrderByConcluidaEmDescDataDesc(any(), any()))
        .thenReturn(List.of());

    PainelDeManutencaoResponse painel = service.painel(1L);

    assertThat(painel.horasDeCelula()).isEqualByComparingTo("3412.5");
    assertThat(painel.parametros().get(0).atual()).isEqualByComparingTo("2890");
    assertThat(painel.parametros().get(0).restante()).isEqualByComparingTo("110");
    assertThat(painel.parametros().get(0).situacao()).isEqualTo(SituacaoDoParametro.ATENCAO);
  }

  @Test
  @DisplayName("agenda com data passada dentro da janela: nasce atrasada, mas é aceita")
  void agendaAtrasada() {
    ManutencaoResponse agendada = service.agendar(pedidoPara(HOJE.minusYears(1)));

    assertThat(agendada.status()).isEqualTo(StatusDaManutencao.PROGRAMADA);
    assertThat(agendada.concluidaEm()).isNull();
  }

  @Test
  @DisplayName("data fora da janela é recusada no campo data, com a decisão antes do desvio")
  void recusaDataForaDaJanela() {
    recusadoNoCampo(() -> service.agendar(pedidoPara(LocalDate.of(1, 1, 1))), "data");
    recusadoNoCampo(() -> service.agendar(pedidoPara(HOJE.plusYears(10).plusDays(1))), "data");

    verify(contexto, times(2)).decisao("manutencao.dataForaDaJanela", true);
    verify(manutencoes, never()).save(any());
  }

  @Test
  @DisplayName("a aeronave do evento não muda numa correção")
  void naoTrocaDeAeronave() {
    salvaComId(LocalDate.parse("2026-09-22"));
    ManutencaoRequest deOutra =
        new ManutencaoRequest(2L, LocalDate.parse("2026-09-22"), null, null, "Inspeção", null);

    assertThatThrownBy(() -> service.atualizar(5L, deOutra))
        .isInstanceOf(ManutencaoInvalidaException.class);
  }

  @Test
  @DisplayName("concluída não se corrige: 409, e o caminho é reabrir")
  void naoCorrigeConcluida() {
    salvaComId(HOJE).concluir(HOJE, AGORA);

    assertThatThrownBy(() -> service.atualizar(5L, pedidoPara(LocalDate.parse("2030-01-01"))))
        .isInstanceOf(ManutencaoConcluidaException.class)
        .extracting(excecao -> ((ExcecaoDeDominio) excecao).getStatus())
        .isEqualTo(HttpStatus.CONFLICT);
  }

  @Test
  @DisplayName("corrigir a descrição de uma antiga não exige mudar a data")
  void corrigeAntigaSemMudarData() {
    LocalDate antiga = HOJE.minusYears(3);
    salvaComId(antiga);

    ManutencaoResponse corrigida =
        service.atualizar(5L, new ManutencaoRequest(1L, antiga, null, null, "Boletim", null));

    assertThat(corrigida.descricao()).isEqualTo("Boletim");
    verify(contexto).decisao("manutencao.dataMudou", false);
  }

  @Test
  @DisplayName("concluir grava o dia informado, que não é o dia do clique")
  void concluiNoDiaInformado() {
    salvaComId(LocalDate.parse("2026-09-22"));

    ManutencaoResponse concluida =
        service.concluir(5L, new ConclusaoRequest(LocalDate.parse("2026-09-08")));

    assertThat(concluida.status()).isEqualTo(StatusDaManutencao.CONCLUIDA);
    assertThat(concluida.concluidaEm()).isEqualTo(LocalDate.parse("2026-09-08"));
  }

  @Test
  @DisplayName("conclusão no futuro ou antes da janela é recusada no campo concluidaEm")
  void recusaConclusaoForaDaJanela() {
    salvaComId(LocalDate.parse("2026-09-22"));

    recusadoNoCampo(
        () -> service.concluir(5L, new ConclusaoRequest(HOJE.plusDays(1))), "concluidaEm");
    recusadoNoCampo(
        () -> service.concluir(5L, new ConclusaoRequest(LocalDate.parse("2025-09-21"))),
        "concluidaEm");
    verify(contexto).decisao("manutencao.conclusaoNoFuturo", true);
  }

  @Test
  @DisplayName("concluir de novo reescreveria o histórico: 409")
  void naoConcluiDeNovo() {
    salvaComId(HOJE).concluir(HOJE, AGORA);

    assertThatThrownBy(() -> service.concluir(5L, new ConclusaoRequest(HOJE)))
        .isInstanceOf(ManutencaoConcluidaException.class);
  }

  @Test
  @DisplayName("parâmetro sem limite é recusado no campo da própria régua")
  void recusaParametroSemLimite() {
    recusadoNoCampo(
        () -> service.criarParametro(parametro(TipoDeParametro.DATA, null, null, "30")),
        "dataLimite");
    recusadoNoCampo(
        () -> service.criarParametro(parametro(TipoDeParametro.HORAS, null, null, "100")),
        "limite");
    assertThatThrownBy(
            () -> service.criarParametro(parametro(TipoDeParametro.HORAS, null, null, "100")))
        .hasMessage("Informe o limite em horas de célula.");
    verify(parametros, never()).save(any());
  }

  @Test
  @DisplayName("ciclos fracionados, aviso além do limite e data absurda são recusados no campo")
  void recusaParametroIncoerente() {
    recusadoNoCampo(
        () -> service.criarParametro(parametro(TipoDeParametro.CICLOS, "3000.5", null, "200")),
        "limite");
    recusadoNoCampo(
        () -> service.criarParametro(parametro(TipoDeParametro.CICLOS, "3000", null, "0.5")),
        "aviso");
    recusadoNoCampo(
        () -> service.criarParametro(parametro(TipoDeParametro.HORAS, "100", null, "5000")),
        "aviso");
    recusadoNoCampo(
        () ->
            service.criarParametro(
                parametro(TipoDeParametro.DATA, null, LocalDate.of(1, 1, 1), "30")),
        "dataLimite");
    verify(parametros, never()).save(any());
  }

  @Test
  @DisplayName("nome repetido na aeronave é 409 no campo nome, com a decisão antes do desvio")
  void recusaNomeRepetido() {
    when(parametros.existsByAeronaveIdAndNomeIgnoreCase(1L, "Inspeção de célula")).thenReturn(true);

    assertThatThrownBy(
            () -> service.criarParametro(parametro(TipoDeParametro.HORAS, "4000", null, "100")))
        .isInstanceOf(ParametroDuplicadoException.class)
        .extracting(excecao -> ((ExcecaoDeDominio) excecao).getCampo())
        .isEqualTo(Optional.of("nome"));
    verify(contexto).decisao("parametro.nomeRepetido", true);
    verify(parametros, never()).save(any());
  }

  @Test
  @DisplayName("na correção, manter o próprio nome não é duplicar")
  void mantemOProprioNome() {
    ParametroDeControle salvo =
        new ParametroDeControle(
            1L,
            new DadosDoParametro(
                "Inspeção de célula",
                TipoDeParametro.HORAS,
                new BigDecimal("4000"),
                null,
                new BigDecimal("100")),
            AGORA);
    ReflectionTestUtils.setField(salvo, "id", 9L);
    when(parametros.findById(9L)).thenReturn(Optional.of(salvo));

    ParametroResponse corrigido =
        service.atualizarParametro(9L, parametro(TipoDeParametro.HORAS, "4500", null, "100"));

    assertThat(corrigido.limite()).isEqualByComparingTo("4500");
    verify(parametros).existsByAeronaveIdAndNomeIgnoreCaseAndIdNot(1L, "Inspeção de célula", 9L);
  }
}
