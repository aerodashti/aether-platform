package br.com.aerodash.aether.voo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.com.aerodash.aether.aeronave.Aeronave;
import br.com.aerodash.aether.aeronave.AeronaveRepository;
import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import br.com.aerodash.aether.proprietario.CorDeIdentificacao;
import br.com.aerodash.aether.proprietario.Proprietario;
import br.com.aerodash.aether.proprietario.ProprietarioRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.YearMonth;
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
@DisplayName("VooService")
class VooServiceTest {

  private static final Instant AGORA = Instant.parse("2026-09-10T12:00:00Z");

  @Mock private TrechoRepository trechos;
  @Mock private AeronaveRepository aeronaves;
  @Mock private ProprietarioRepository proprietarios;
  @Mock private ContextoDaRequisicao contexto;

  private VooService service;
  private Aeronave aeronave;
  private Proprietario ricardo;

  @BeforeEach
  void montar() {
    service =
        new VooService(
            trechos, aeronaves, proprietarios, Clock.fixed(AGORA, ZoneOffset.UTC), contexto);
    aeronave =
        new Aeronave(
            "PS-MEP",
            "Citation XLS+",
            "SBSP",
            LocalDate.parse("2027-01-01"),
            LocalDate.parse("2027-02-01"),
            AGORA);
    ReflectionTestUtils.setField(aeronave, "id", 1L);
    ricardo = new Proprietario("Ricardo", null, null, null, CorDeIdentificacao.PETROLEO, AGORA);
    ReflectionTestUtils.setField(ricardo, "id", 7L);

    when(aeronaves.findById(1L)).thenReturn(Optional.of(aeronave));
    when(aeronaves.findAllById(any())).thenReturn(List.of(aeronave));
    when(proprietarios.findById(7L)).thenReturn(Optional.of(ricardo));
    when(proprietarios.findAllById(any())).thenReturn(List.of(ricardo));
    when(trechos.save(any())).thenAnswer(chamada -> chamada.getArgument(0));
  }

  private TrechoRequest request(Long proprietarioId) {
    return new TrechoRequest(
        1L,
        "RV-2026-041",
        1,
        LocalDate.parse("2026-09-08"),
        "sbsp",
        "sbrj",
        new BigDecimal("365.0"),
        LocalTime.parse("08:30"),
        LocalTime.parse("09:30"),
        null,
        null,
        proprietarioId,
        null);
  }

  @Test
  @DisplayName("lançar alimenta os contadores: horas, km e um pouso")
  void lancarAlimentaContadores() {
    TrechoResponse criado = service.criar(request(7L));

    assertThat(criado.horas()).isEqualByComparingTo("1.0");
    assertThat(criado.nomeDoProprietario()).isEqualTo("Ricardo");
    assertThat(aeronave.getContadores().horasDeCelula()).isEqualByComparingTo("1.0");
    assertThat(aeronave.getContadores().ciclos()).isEqualTo(1);
    assertThat(aeronave.getContadores().kmVoados()).isEqualByComparingTo("365.0");
  }

  @Test
  @DisplayName("corrigir estorna o velho e aplica o novo — os contadores não dobram")
  void corrigirEstornaEReaplica() {
    TrechoResponse criado = service.criar(request(7L));
    Trecho salvo = new Trecho(1L, dadosDe(request(7L)), AGORA);
    when(trechos.findById(any())).thenReturn(Optional.of(salvo));

    TrechoRequest maisLongo =
        new TrechoRequest(
            1L,
            "RV-2026-041",
            1,
            LocalDate.parse("2026-09-08"),
            "SBSP",
            "SBSV",
            new BigDecimal("1962.0"),
            LocalTime.parse("09:00"),
            LocalTime.parse("11:40"),
            null,
            null,
            7L,
            null);
    service.atualizar(criado.id(), maisLongo);

    assertThat(aeronave.getContadores().horasDeCelula()).isEqualByComparingTo("2.7");
    assertThat(aeronave.getContadores().ciclos()).isEqualTo(1);
    assertThat(aeronave.getContadores().kmVoados()).isEqualByComparingTo("1962.0");
  }

  @Test
  @DisplayName("excluir estorna tudo")
  void excluirEstorna() {
    service.criar(request(7L));
    Trecho salvo = new Trecho(1L, dadosDe(request(7L)), AGORA);
    when(trechos.findById(5L)).thenReturn(Optional.of(salvo));

    service.excluir(5L);

    assertThat(aeronave.getContadores().horasDeCelula()).isEqualByComparingTo("0");
    assertThat(aeronave.getContadores().ciclos()).isZero();
    verify(trechos).delete(salvo);
  }

  @Test
  @DisplayName("a aeronave do trecho não muda numa correção")
  void naoTrocaDeAeronave() {
    Trecho salvo = new Trecho(1L, dadosDe(request(7L)), AGORA);
    when(trechos.findById(5L)).thenReturn(Optional.of(salvo));

    TrechoRequest deOutra =
        new TrechoRequest(
            2L,
            "RV-1",
            1,
            LocalDate.parse("2026-09-08"),
            "SBSP",
            "SBRJ",
            BigDecimal.ONE,
            null,
            null,
            null,
            null,
            null,
            null);

    assertThatThrownBy(() -> service.atualizar(5L, deOutra))
        .isInstanceOf(VooInvalidoException.class);
  }

  @Test
  @DisplayName("atribuição a proprietário inativo é recusada antes de salvar")
  void recusaProprietarioInativo() {
    ricardo.desativar(AGORA);

    assertThatThrownBy(() -> service.criar(request(7L)))
        .isInstanceOf(VooInvalidoException.class)
        .hasMessageContaining("Ricardo");
    verify(trechos, never()).save(any());
  }

  @Test
  @DisplayName("a linha de totais soma o recorte no servidor")
  void totaisDoRecorte() {
    Trecho primeiro = new Trecho(1L, dadosDe(request(7L)), AGORA);
    Trecho manutencao = new Trecho(1L, dadosDe(request(null)), AGORA);
    when(trechos.findByAeronaveIdAndDataBetweenOrderByDataDescRelatorioDeVooDescNumeroDoTrechoDesc(
            1L, LocalDate.parse("2026-09-01"), LocalDate.parse("2026-09-30")))
        .thenReturn(List.of(primeiro, manutencao));

    DiarioDeVoosResponse diario = service.listar(1L, YearMonth.parse("2026-09"));

    assertThat(diario.totais().pousos()).isEqualTo(2);
    assertThat(diario.totais().horas()).isEqualByComparingTo("2.0");
    assertThat(diario.totais().km()).isEqualByComparingTo("730.0");
    assertThat(diario.trechos().get(1).vooDeManutencao()).isTrue();
  }

  private DadosDoTrecho dadosDe(TrechoRequest request) {
    return new DadosDoTrecho(
        request.relatorioDeVoo(),
        request.numeroDoTrecho(),
        request.data(),
        request.origem(),
        request.destino(),
        request.km(),
        request.partidaPrevista(),
        request.pousoPrevisto(),
        request.partidaRealizada(),
        request.pousoRealizado(),
        request.proprietarioId(),
        request.observacoes());
  }
}
