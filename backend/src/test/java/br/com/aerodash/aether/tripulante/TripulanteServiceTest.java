package br.com.aerodash.aether.tripulante;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import br.com.aerodash.aether.aeronave.AeronaveRepository;
import br.com.aerodash.aether.comum.erro.RecursoNaoEncontradoException;
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
@DisplayName("TripulanteService")
class TripulanteServiceTest {

  private static final Instant AGORA = Instant.parse("2026-09-10T12:00:00Z");
  private static final Long AERONAVE = 1L;

  @Mock private TripulanteRepository tripulantes;
  @Mock private AeronaveRepository aeronaves;
  @Mock private ContextoDaRequisicao contexto;

  private TripulanteService service;

  @BeforeEach
  void montar() {
    service =
        new TripulanteService(
            tripulantes,
            aeronaves,
            new TripulanteMapper(),
            Clock.fixed(AGORA, ZoneOffset.UTC),
            contexto);
    when(aeronaves.existsById(AERONAVE)).thenReturn(true);
    when(tripulantes.save(any())).thenAnswer(chamada -> chamada.getArgument(0));
  }

  private TripulanteRequest request(String nome, LocalDate cht) {
    return new TripulanteRequest(
        nome,
        "112233",
        FuncaoDoTripulante.COMANDANTE,
        LocalDate.parse("2027-01-10"),
        cht,
        new BigDecimal("8420.0"),
        null,
        null,
        SituacaoDoTripulante.ATIVO);
  }

  @Test
  @DisplayName("a lista julga CMA e CHT contra o relógio do servidor")
  void listaJulgaValidades() {
    Tripulante vencido =
        new Tripulante(
            AERONAVE,
            new DadosDoTripulante(
                "Juliana",
                null,
                FuncaoDoTripulante.COPILOTO,
                LocalDate.parse("2026-12-01"),
                LocalDate.parse("2026-09-01"),
                null,
                null,
                null,
                SituacaoDoTripulante.ATIVO),
            AGORA);
    when(tripulantes.findByAeronaveIdOrderByNomeAsc(AERONAVE)).thenReturn(List.of(vencido));

    List<TripulanteResponse> lista = service.listar(AERONAVE);

    assertThat(lista.get(0).cmaVencido()).isFalse();
    assertThat(lista.get(0).chtVencido()).isTrue();
  }

  @Test
  @DisplayName("cria vinculado à aeronave da rota")
  void cria() {
    TripulanteResponse criado = service.criar(AERONAVE, request("Marcos Vilela", null));

    assertThat(criado.nome()).isEqualTo("Marcos Vilela");
    assertThat(criado.chtVencido()).isFalse();
  }

  @Test
  @DisplayName("não atualiza tripulante de outra aeronave — 404, não vazamento")
  void naoAtualizaDeOutraAeronave() {
    Tripulante deOutra =
        new Tripulante(
            2L,
            new DadosDoTripulante(
                "Marcos",
                null,
                FuncaoDoTripulante.COMANDANTE,
                null,
                null,
                null,
                null,
                null,
                SituacaoDoTripulante.ATIVO),
            AGORA);
    ReflectionTestUtils.setField(deOutra, "id", 7L);
    when(tripulantes.findById(7L)).thenReturn(Optional.of(deOutra));

    assertThatThrownBy(() -> service.atualizar(AERONAVE, 7L, request("Marcos", null)))
        .isInstanceOf(RecursoNaoEncontradoException.class);
  }

  @Test
  @DisplayName("aeronave desconhecida é 404 antes de qualquer consulta")
  void aeronaveDesconhecida() {
    when(aeronaves.existsById(99L)).thenReturn(false);

    assertThatThrownBy(() -> service.listar(99L)).isInstanceOf(RecursoNaoEncontradoException.class);
  }
}
