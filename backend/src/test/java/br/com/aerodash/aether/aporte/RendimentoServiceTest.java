package br.com.aerodash.aether.aporte;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.com.aerodash.aether.aeronave.Aeronave;
import br.com.aerodash.aether.aeronave.AeronaveRepository;
import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
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
@DisplayName("RendimentoService")
class RendimentoServiceTest {

  /** 22h do dia 5 em Brasília: em UTC, já é dia 6. */
  private static final Instant AO_ANOITECER = Instant.parse("2026-10-06T01:00:00Z");

  @Mock private RendimentoRepository rendimentos;
  @Mock private AeronaveRepository aeronaves;
  @Mock private ContextoDaRequisicao contexto;

  private RendimentoService service;

  @BeforeEach
  void montar() {
    service =
        new RendimentoService(
            rendimentos, aeronaves, Clock.fixed(AO_ANOITECER, ZoneOffset.UTC), contexto);
    Aeronave aeronave =
        new Aeronave(
            "PS-MEP",
            "Citation XLS+",
            "SBSP",
            LocalDate.parse("2027-01-01"),
            LocalDate.parse("2027-02-01"),
            AO_ANOITECER);
    ReflectionTestUtils.setField(aeronave, "id", 1L);

    when(aeronaves.existsById(1L)).thenReturn(true);
    when(aeronaves.findAllById(any())).thenReturn(List.of(aeronave));
    when(rendimentos.save(any())).thenAnswer(chamada -> chamada.getArgument(0));
  }

  private static RendimentoRequest request(Long aeronaveId, LocalDate data) {
    return new RendimentoRequest(
        aeronaveId,
        data,
        "CDB DI",
        new BigDecimal("104200.00"),
        new BigDecimal("0.91"),
        new BigDecimal("948.22"));
  }

  private static void recusadoNoCampo(ThrowingCallable acao, String campo, String trecho) {
    assertThatThrownBy(acao)
        .isInstanceOfSatisfying(
            AporteInvalidoException.class,
            recusa -> {
              assertThat(recusa.getCampo()).contains(campo);
              assertThat(recusa.getMessage()).contains(trecho);
            });
  }

  @Test
  @DisplayName("registra o crédito de hoje em Brasília, mesmo com o relógio em UTC no dia seguinte")
  void registraHojeEmBrasilia() {
    RendimentoResponse resposta = service.criar(request(1L, LocalDate.parse("2026-10-05")));

    assertThat(resposta.matricula()).isEqualTo("PS-MEP");
    assertThat(resposta.valor()).isEqualByComparingTo("948.22");
  }

  @Test
  @DisplayName("o dia seguinte em Brasília é futuro: recusado no campo data")
  void recusaFuturo() {
    recusadoNoCampo(
        () -> service.criar(request(1L, LocalDate.parse("2026-10-06"))),
        "data",
        "depois que o crédito cair");
    verify(rendimentos, never()).save(any());
  }

  @Test
  @DisplayName("data antes de 2000 é ano digitado errado: recusada no campo data")
  void recusaDataAntiga() {
    recusadoNoCampo(
        () -> service.criar(request(1L, LocalDate.parse("1900-01-01"))), "data", "01/01/2000");
    verify(rendimentos, never()).save(any());
  }

  @Test
  @DisplayName("aeronave inexistente no corpo é erro do campo, não 404")
  void aeronaveInexistente() {
    recusadoNoCampo(
        () -> service.criar(request(999L, LocalDate.parse("2026-10-05"))),
        "aeronaveId",
        "Aeronave não encontrada");
  }

  @Test
  @DisplayName("a aeronave do rendimento não muda na correção: recusa no campo aeronaveId")
  void naoTrocaAeronave() {
    Rendimento existente =
        new Rendimento(
            1L,
            new DadosDoRendimento(
                LocalDate.parse("2026-09-28"), "CDB DI", null, null, new BigDecimal("948.22")),
            AO_ANOITECER);
    when(rendimentos.findById(9L)).thenReturn(Optional.of(existente));

    recusadoNoCampo(
        () -> service.atualizar(9L, request(2L, LocalDate.parse("2026-09-28"))),
        "aeronaveId",
        "não muda");
  }
}
