package br.com.aerodash.aether.saude;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

import br.com.aerodash.aether.comum.erro.RecursoNaoEncontradoException;
import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import java.time.Clock;
import java.time.Instant;
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

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("SaudeService")
class SaudeServiceTest {

  private static final Instant AGORA = Instant.parse("2026-09-04T12:00:00Z");

  @Mock private SaudeRepository repository;
  @Mock private SaudeMapper mapper;
  @Mock private ContextoDaRequisicao contexto;

  private SaudeService service;

  @BeforeEach
  void prepararService() {
    Clock relogio = Clock.fixed(AGORA, ZoneOffset.UTC);
    service = new SaudeService(repository, mapper, relogio, contexto, "0.1.0");
    when(mapper.paraListaDeResponse(anyList(), any())).thenReturn(List.of());
  }

  @Test
  @DisplayName("marca como verificados os componentes que a própria requisição comprova")
  void verificarSituacaoGeralRegistraApiEBanco() {
    RegistroDeSaude banco =
        new RegistroDeSaude("banco", SituacaoDeSaude.DEGRADADO, AGORA.minusSeconds(3600));
    RegistroDeSaude rab =
        new RegistroDeSaude("rab", SituacaoDeSaude.OPERANTE, AGORA.minusSeconds(30));
    when(repository.findAllByOrderByComponenteAsc()).thenReturn(List.of(banco, rab));

    service.verificarSituacaoGeral();

    assertThat(banco.getSituacao()).isEqualTo(SituacaoDeSaude.OPERANTE);
    assertThat(banco.getVerificadoEm()).isEqualTo(AGORA);
    assertThat(rab.getVerificadoEm()).isEqualTo(AGORA.minusSeconds(30));
  }

  @Test
  @DisplayName("consolida como OPERANTE quando todos os componentes estão saudáveis")
  void situacaoGeralOperante() {
    when(repository.findAllByOrderByComponenteAsc())
        .thenReturn(
            List.of(
                new RegistroDeSaude("api", SituacaoDeSaude.OPERANTE, AGORA),
                new RegistroDeSaude("banco", SituacaoDeSaude.OPERANTE, AGORA)));

    assertThat(service.verificarSituacaoGeral().situacaoGeral())
        .isEqualTo(SituacaoDeSaude.OPERANTE);
  }

  @Test
  @DisplayName("consolida como DEGRADADO quando um componente externo está defasado")
  void situacaoGeralDegradada() {
    when(repository.findAllByOrderByComponenteAsc())
        .thenReturn(
            List.of(
                new RegistroDeSaude("api", SituacaoDeSaude.OPERANTE, AGORA),
                new RegistroDeSaude("rab", SituacaoDeSaude.OPERANTE, AGORA.minusSeconds(3600))));

    assertThat(service.verificarSituacaoGeral().situacaoGeral())
        .isEqualTo(SituacaoDeSaude.DEGRADADO);
  }

  @Test
  @DisplayName("consolida como INDISPONIVEL quando algum componente está indisponível")
  void situacaoGeralIndisponivelPorComponente() {
    when(repository.findAllByOrderByComponenteAsc())
        .thenReturn(
            List.of(
                new RegistroDeSaude("api", SituacaoDeSaude.OPERANTE, AGORA),
                new RegistroDeSaude("rab", SituacaoDeSaude.INDISPONIVEL, AGORA)));

    assertThat(service.verificarSituacaoGeral().situacaoGeral())
        .isEqualTo(SituacaoDeSaude.INDISPONIVEL);
  }

  @Test
  @DisplayName("consolida como INDISPONIVEL quando não há componente monitorado")
  void situacaoGeralIndisponivelSemRegistros() {
    when(repository.findAllByOrderByComponenteAsc()).thenReturn(List.of());

    assertThat(service.verificarSituacaoGeral().situacaoGeral())
        .isEqualTo(SituacaoDeSaude.INDISPONIVEL);
  }

  @Test
  @DisplayName("recusa componente que não é monitorado")
  void consultarComponenteInexistenteFalha() {
    when(repository.findByComponente("inexistente")).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.consultarComponente("inexistente"))
        .isInstanceOf(RecursoNaoEncontradoException.class)
        .hasMessageContaining("não é monitorado");
  }
}
