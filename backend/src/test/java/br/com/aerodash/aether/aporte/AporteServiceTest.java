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
import br.com.aerodash.aether.proprietario.CorDeIdentificacao;
import br.com.aerodash.aether.proprietario.Proprietario;
import br.com.aerodash.aether.proprietario.ProprietarioRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
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
@DisplayName("AporteService")
class AporteServiceTest {

  private static final Instant AGORA = Instant.parse("2026-10-05T12:00:00Z");

  @Mock private AporteRepository aportes;
  @Mock private AeronaveRepository aeronaves;
  @Mock private ProprietarioRepository proprietarios;
  @Mock private ParticipantesDaAeronave participantes;
  @Mock private ContextoDaRequisicao contexto;

  private AporteService service;

  @BeforeEach
  void montar() {
    service =
        new AporteService(
            aportes,
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
    Proprietario ricardo =
        new Proprietario("Ricardo", null, null, null, CorDeIdentificacao.PETROLEO, AGORA);
    ReflectionTestUtils.setField(ricardo, "id", 7L);

    when(aeronaves.findById(1L)).thenReturn(Optional.of(aeronave));
    when(aeronaves.findAllById(any())).thenReturn(List.of(aeronave));
    when(proprietarios.existsById(7L)).thenReturn(true);
    when(proprietarios.findAllById(any())).thenReturn(List.of(ricardo));
    when(participantes.participaOuParticipou(1L, 7L)).thenReturn(true);
    when(aportes.save(any())).thenAnswer(chamada -> chamada.getArgument(0));
  }

  private AporteRequest request(LocalDate data) {
    return new AporteRequest(1L, 7L, data, YearMonth.of(2026, 9), new BigDecimal("25000.00"));
  }

  @Test
  @DisplayName("registra o aporte recebido com nome e matrícula resolvidos")
  void registra() {
    AporteResponse resposta = service.criar(request(LocalDate.parse("2026-10-03")));

    assertThat(resposta.matricula()).isEqualTo("PS-MEP");
    assertThat(resposta.nomeDoProprietario()).isEqualTo("Ricardo");
    assertThat(resposta.competencia()).isEqualTo(YearMonth.of(2026, 9));
  }

  @Test
  @DisplayName("crédito com data futura é previsão: recusado antes de salvar")
  void recusaFuturo() {
    assertThatThrownBy(() -> service.criar(request(LocalDate.parse("2026-10-06"))))
        .isInstanceOf(AporteInvalidoException.class)
        .hasMessageContaining("registrado como recebido");
    verify(aportes, never()).save(any());
  }

  @Test
  @DisplayName("quem nunca participou da aeronave não aporta nela")
  void recusaQuemNaoParticipa() {
    when(participantes.participaOuParticipou(1L, 7L)).thenReturn(false);

    assertThatThrownBy(() -> service.criar(request(LocalDate.parse("2026-10-03"))))
        .isInstanceOf(AporteInvalidoException.class)
        .hasMessageContaining("nunca participou");
    verify(aportes, never()).save(any());
  }

  @Test
  @DisplayName("o total do recorte é somado no servidor")
  void totalDoRecorte() {
    when(aportes.findByAeronaveIdAndCompetenciaBetweenOrderByDataDescIdDesc(any(), any(), any()))
        .thenReturn(
            List.of(
                new Aporte(
                    1L,
                    7L,
                    LocalDate.parse("2026-10-03"),
                    YearMonth.of(2026, 9),
                    new BigDecimal("25000.00"),
                    AGORA),
                new Aporte(
                    1L,
                    7L,
                    LocalDate.parse("2026-09-04"),
                    YearMonth.of(2026, 8),
                    new BigDecimal("15000.50"),
                    AGORA)));
    when(aeronaves.existsById(1L)).thenReturn(true);

    AportesResponse resposta = service.listar(1L, YearMonth.of(2026, 8), YearMonth.of(2026, 9));

    assertThat(resposta.aportes()).hasSize(2);
    assertThat(resposta.total()).isEqualByComparingTo("40000.50");
  }

  @Test
  @DisplayName("período invertido é erro de entrada, não lista vazia")
  void periodoInvertido() {
    assertThatThrownBy(() -> service.listar(null, YearMonth.of(2026, 9), YearMonth.of(2026, 1)))
        .isInstanceOf(AporteInvalidoException.class);
  }

  @Test
  @DisplayName("a aeronave do aporte não muda na correção")
  void naoTrocaAeronave() {
    Aporte existente =
        new Aporte(
            1L, 7L, LocalDate.parse("2026-10-03"), YearMonth.of(2026, 9), BigDecimal.TEN, AGORA);
    when(aportes.findById(5L)).thenReturn(Optional.of(existente));

    AporteRequest outraAeronave =
        new AporteRequest(
            2L, 7L, LocalDate.parse("2026-10-03"), YearMonth.of(2026, 9), BigDecimal.TEN);

    assertThatThrownBy(() -> service.atualizar(5L, outraAeronave))
        .isInstanceOf(AporteInvalidoException.class)
        .hasMessageContaining("não muda");
  }
}
