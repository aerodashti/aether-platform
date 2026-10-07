package br.com.aerodash.aether.troca;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.com.aerodash.aether.aeronave.Aeronave;
import br.com.aerodash.aether.aeronave.AeronaveRepository;
import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import br.com.aerodash.aether.proprietario.ProprietarioRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
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
@DisplayName("TrocaService")
class TrocaServiceTest {

  private static final Instant AGORA = Instant.parse("2026-10-06T12:00:00Z");

  /** 22h de 06/10 em Brasília: o relógio UTC já está em 07/10. */
  private static final Instant NOITE_EM_BRASILIA = Instant.parse("2026-10-07T01:00:00Z");

  @Mock private TrocaDeKmRepository trocas;
  @Mock private AeronaveRepository aeronaves;
  @Mock private ProprietarioRepository proprietarios;
  @Mock private ParticipantesDaTroca participantes;
  @Mock private ContextoDaRequisicao contexto;

  private TrocaService service;

  @BeforeEach
  void montar() {
    service = serviceEm(AGORA);
    Aeronave aeronave =
        new Aeronave(
            "PS-MEP",
            "Citation XLS+",
            "SBSP",
            LocalDate.parse("2027-01-01"),
            LocalDate.parse("2027-02-01"),
            AGORA);
    ReflectionTestUtils.setField(aeronave, "id", 1L);
    when(aeronaves.existsById(1L)).thenReturn(true);
    when(aeronaves.findAllById(any())).thenReturn(List.of(aeronave));
    when(proprietarios.existsById(anyLong())).thenReturn(true);
    when(proprietarios.findAllById(any())).thenReturn(List.of());
    when(participantes.participaOuParticipou(any(), any())).thenReturn(true);
    when(trocas.save(any())).thenAnswer(chamada -> chamada.getArgument(0));
  }

  private TrocaService serviceEm(Instant agora) {
    return new TrocaService(
        trocas,
        aeronaves,
        proprietarios,
        participantes,
        Clock.fixed(agora, ZoneOffset.UTC),
        contexto);
  }

  private static TrocaRequest request(Long cedente, Long recebedor, String data) {
    return new TrocaRequest(
        1L,
        LocalDate.parse(data),
        cedente,
        recebedor,
        new BigDecimal("2.5"),
        null,
        null,
        null,
        null);
  }

  private static ConclusaoDaTrocaRequest devolvidaEm(String data) {
    return new ConclusaoDaTrocaRequest(LocalDate.parse(data));
  }

  /** A recusa nomeia o campo do JSON: é por ele que a tela marca o campo certo. */
  private static void recusadoNoCampo(ThrowingCallable acao, String campo) {
    assertThatThrownBy(acao)
        .isInstanceOfSatisfying(
            TrocaInvalidaException.class, recusa -> assertThat(recusa.getCampo()).contains(campo));
  }

  private TrocaDeKm salva(String data) {
    TrocaDeKm troca = new TrocaDeKm(1L, dados(1L, 2L, "2.5", data), AGORA);
    when(trocas.findById(5L)).thenReturn(Optional.of(troca));
    return troca;
  }

  @Test
  @DisplayName("registra pendente")
  void registra() {
    assertThat(service.registrar(request(1L, 2L, "2026-10-01")).situacao())
        .isEqualTo(SituacaoDaTroca.PENDENTE);
  }

  @Test
  @DisplayName("cada recusa de regra nomeia o campo: recebedor, data, cedente")
  void recusasNoCampo() {
    recusadoNoCampo(() -> service.registrar(request(1L, 1L, "2026-10-01")), "recebedorId");
    recusadoNoCampo(() -> service.registrar(request(1L, 2L, "2026-10-07")), "data");
    recusadoNoCampo(() -> service.registrar(request(1L, 2L, "1999-12-31")), "data");
    when(participantes.participaOuParticipou(1L, 1L)).thenReturn(false);
    recusadoNoCampo(() -> service.registrar(request(1L, 2L, "2026-10-01")), "cedenteId");
    verify(trocas, never()).save(any());
  }

  @Test
  @DisplayName("aeronave ou proprietário que não existem são recusa do campo, não 404")
  void idDoCorpoInexistente() {
    when(proprietarios.existsById(2L)).thenReturn(false);
    recusadoNoCampo(() -> service.registrar(request(1L, 2L, "2026-10-01")), "recebedorId");

    when(aeronaves.existsById(1L)).thenReturn(false);
    recusadoNoCampo(() -> service.registrar(request(1L, 3L, "2026-10-01")), "aeronaveId");
    verify(trocas, never()).save(any());
  }

  @Test
  @DisplayName("às 22h em Brasília, amanhã ainda é futuro, embora o relógio UTC já esteja nele")
  void hojeNoFusoDoNegocio() {
    TrocaService aNoite = serviceEm(NOITE_EM_BRASILIA);

    recusadoNoCampo(() -> aNoite.registrar(request(1L, 2L, "2026-10-07")), "data");
    assertThat(aNoite.registrar(request(1L, 2L, "2026-10-06")).data())
        .isEqualTo(LocalDate.parse("2026-10-06"));

    salva("2026-10-01");
    recusadoNoCampo(() -> aNoite.concluir(5L, devolvidaEm("2026-10-07")), "concluidaEm");
  }

  @Test
  @DisplayName("a aeronave da troca não muda na correção")
  void aeronaveNaoMuda() {
    salva("2026-10-01");
    TrocaRequest outraAeronave =
        new TrocaRequest(
            2L,
            LocalDate.parse("2026-10-01"),
            1L,
            2L,
            new BigDecimal("2.5"),
            null,
            null,
            null,
            null);

    recusadoNoCampo(() -> service.atualizar(5L, outraAeronave), "aeronaveId");
  }

  @Test
  @DisplayName("conclui na data informada, entre a data da troca e hoje")
  void concluiNaDataInformada() {
    salva("2026-09-20");

    recusadoNoCampo(() -> service.concluir(5L, devolvidaEm("2026-09-19")), "concluidaEm");
    recusadoNoCampo(() -> service.concluir(5L, devolvidaEm("2026-10-07")), "concluidaEm");

    TrocaResponse concluida = service.concluir(5L, devolvidaEm("2026-10-03"));
    assertThat(concluida.situacao()).isEqualTo(SituacaoDaTroca.CONCLUIDA);
    assertThat(concluida.concluidaEm()).isEqualTo(LocalDate.parse("2026-10-03"));
  }

  @Test
  @DisplayName("concluir de novo não troca a data da primeira devolução")
  void concluirDeNovo() {
    TrocaDeKm troca = salva("2026-09-20");
    troca.concluir(LocalDate.parse("2026-10-03"), AGORA);

    assertThat(service.concluir(5L, devolvidaEm("2026-10-05")).concluidaEm())
        .isEqualTo(LocalDate.parse("2026-10-03"));
  }

  @Test
  @DisplayName("a correção de uma concluída não põe a troca depois da devolução")
  void correcaoDeConcluida() {
    TrocaDeKm troca = salva("2026-09-20");
    troca.concluir(LocalDate.parse("2026-10-03"), AGORA);

    recusadoNoCampo(() -> service.atualizar(5L, request(1L, 2L, "2026-10-05")), "data");
    assertThat(service.atualizar(5L, request(1L, 2L, "2026-10-03")).data())
        .isEqualTo(LocalDate.parse("2026-10-03"));
  }

  @Test
  @DisplayName("lista a situação pedida, conta as duas abas e dá o saldo do proprietário")
  void listaComSaldo() {
    TrocaDeKm pendente = new TrocaDeKm(1L, dados(1L, 2L, "2.5", "2026-09-20"), AGORA);
    TrocaDeKm outra = new TrocaDeKm(1L, dados(3L, 1L, "1.0", "2026-09-20"), AGORA);
    TrocaDeKm concluida = new TrocaDeKm(1L, dados(2L, 1L, "4.0", "2026-09-20"), AGORA);
    concluida.concluir(LocalDate.parse("2026-10-01"), AGORA);
    when(trocas.findAllByOrderByDataDescIdDesc()).thenReturn(List.of(pendente, outra, concluida));

    TrocasResponse resposta = service.listar(null, 1L, null);

    assertThat(resposta.trocas()).hasSize(2);
    assertThat(resposta.pendentes()).isEqualTo(2);
    assertThat(resposta.concluidas()).isEqualTo(1);
    // Ricardo cedeu 2,5 e recebeu 1,0: tem 1,5 a receber de volta.
    assertThat(resposta.saldo().horasADevolver()).isEqualByComparingTo("-1.5");
  }

  private static DadosDaTroca dados(Long cedente, Long recebedor, String horas, String data) {
    return new DadosDaTroca(
        LocalDate.parse(data), cedente, recebedor, new BigDecimal(horas), null, null, null, null);
  }
}
