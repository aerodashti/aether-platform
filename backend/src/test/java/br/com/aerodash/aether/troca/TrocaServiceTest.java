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
import br.com.aerodash.aether.comum.erro.RecursoNaoEncontradoException;
import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import br.com.aerodash.aether.proprietario.ProprietarioRepository;
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
@DisplayName("TrocaService")
class TrocaServiceTest {

  private static final Instant AGORA = Instant.parse("2026-10-06T12:00:00Z");

  @Mock private TrocaDeKmRepository trocas;
  @Mock private AeronaveRepository aeronaves;
  @Mock private ProprietarioRepository proprietarios;
  @Mock private ParticipantesDaTroca participantes;
  @Mock private ContextoDaRequisicao contexto;

  private TrocaService service;

  @BeforeEach
  void montar() {
    service =
        new TrocaService(
            trocas,
            aeronaves,
            proprietarios,
            participantes,
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
    when(aeronaves.findById(1L)).thenReturn(Optional.of(aeronave));
    when(aeronaves.findAllById(any())).thenReturn(List.of(aeronave));
    when(proprietarios.existsById(anyLong())).thenReturn(true);
    when(proprietarios.findAllById(any())).thenReturn(List.of());
    when(participantes.participaOuParticipou(any(), any())).thenReturn(true);
    when(trocas.save(any())).thenAnswer(chamada -> chamada.getArgument(0));
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

  @Test
  @DisplayName("registra pendente")
  void registra() {
    assertThat(service.registrar(request(1L, 2L, "2026-10-01")).situacao())
        .isEqualTo(SituacaoDaTroca.PENDENTE);
  }

  @Test
  @DisplayName("mesmo proprietário dos dois lados, data futura e quem não participa são recusados")
  void recusas() {
    assertThatThrownBy(() -> service.registrar(request(1L, 1L, "2026-10-01")))
        .isInstanceOf(TrocaInvalidaException.class)
        .hasMessageContaining("diferentes");
    assertThatThrownBy(() -> service.registrar(request(1L, 2L, "2026-10-07")))
        .isInstanceOf(TrocaInvalidaException.class)
        .hasMessageContaining("futura");
    when(participantes.participaOuParticipou(1L, 2L)).thenReturn(false);
    assertThatThrownBy(() -> service.registrar(request(1L, 2L, "2026-10-01")))
        .isInstanceOf(TrocaInvalidaException.class)
        .hasMessageContaining("contrato");
    verify(trocas, never()).save(any());
  }

  @Test
  @DisplayName("lista a situação pedida, conta as duas abas e dá o saldo do proprietário")
  void listaComSaldo() {
    TrocaDeKm pendente = new TrocaDeKm(1L, dados(1L, 2L, "2.5"), AGORA);
    TrocaDeKm outra = new TrocaDeKm(1L, dados(3L, 1L, "1.0"), AGORA);
    TrocaDeKm concluida = new TrocaDeKm(1L, dados(2L, 1L, "4.0"), AGORA);
    concluida.concluir(LocalDate.parse("2026-10-01"), AGORA);
    when(trocas.findAllByOrderByDataDescIdDesc()).thenReturn(List.of(pendente, outra, concluida));

    TrocasResponse resposta = service.listar(null, 1L, null);

    assertThat(resposta.trocas()).hasSize(2);
    assertThat(resposta.pendentes()).isEqualTo(2);
    assertThat(resposta.concluidas()).isEqualTo(1);
    // Ricardo cedeu 2,5 e recebeu 1,0: tem 1,5 a receber de volta.
    assertThat(resposta.saldo().horasADevolver()).isEqualByComparingTo("-1.5");
  }

  @Test
  @DisplayName("filtrar por aeronave ou proprietário que não existe é 404, não um saldo de 0 h")
  void filtroInexistente() {
    when(proprietarios.existsById(99L)).thenReturn(false);

    assertThatThrownBy(() -> service.listar(99L, null, null))
        .isInstanceOf(RecursoNaoEncontradoException.class)
        .hasMessage("Aeronave não encontrada.");
    assertThatThrownBy(() -> service.listar(null, 99L, null))
        .isInstanceOf(RecursoNaoEncontradoException.class)
        .hasMessage("Proprietário não encontrado.");
    verify(contexto).decisao("trocas.proprietarioDoFiltroExiste", false);
    verify(trocas, never()).findAllByOrderByDataDescIdDesc();
  }

  private static DadosDaTroca dados(Long cedente, Long recebedor, String horas) {
    return new DadosDaTroca(
        LocalDate.parse("2026-09-20"),
        cedente,
        recebedor,
        new BigDecimal(horas),
        null,
        null,
        null,
        null);
  }
}
