package br.com.aerodash.aether.voo;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import br.com.aerodash.aether.proprietario.CorDeIdentificacao;
import br.com.aerodash.aether.proprietario.Proprietario;
import br.com.aerodash.aether.proprietario.ProprietarioRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
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
@DisplayName("ValidacaoDoTrecho")
class ValidacaoDoTrechoTest {

  private static final Instant AGORA = Instant.parse("2026-09-10T12:00:00Z");
  private static final LocalDate HOJE = LocalDate.parse("2026-09-10");

  @Mock private ProprietarioRepository proprietarios;
  @Mock private ParticipantesDoVoo participantes;
  @Mock private ContextoDaRequisicao contexto;

  private ValidacaoDoTrecho validacao;
  private Proprietario ricardo;

  @BeforeEach
  void montar() {
    validacao = new ValidacaoDoTrecho(proprietarios, participantes, contexto);
    ricardo = new Proprietario("Ricardo", null, null, null, CorDeIdentificacao.PETROLEO, AGORA);
    ReflectionTestUtils.setField(ricardo, "id", 7L);
    when(proprietarios.findById(7L)).thenReturn(Optional.of(ricardo));
    when(participantes.participaOuParticipou(1L, 7L)).thenReturn(true);
  }

  private static Instant em(String instante) {
    return instante == null ? null : Instant.parse(instante);
  }

  private static DadosDoTrecho dados(
      String data, String depPrev, String arrPrev, String depReal, String arrReal) {
    return new DadosDoTrecho(
        "rv-2026-041",
        1,
        LocalDate.parse(data),
        "SBSP",
        "SBRJ",
        new BigDecimal("365.0"),
        em(depPrev),
        em(arrPrev),
        em(depReal),
        em(arrReal),
        7L,
        null);
  }

  private static Trecho trecho(String depPrev, String arrPrev, String depReal, String arrReal) {
    return new Trecho(1L, dados("2026-09-08", depPrev, arrPrev, depReal, arrReal), AGORA);
  }

  private void exigirHorarios(String depPrev, String arrPrev, String depReal, String arrReal) {
    validacao.exigirHorariosCoerentes(trecho(depPrev, arrPrev, depReal, arrReal), AGORA);
  }

  private static void recusaNoCampo(ThrowingCallable acao, String campo, String mensagem) {
    assertThatThrownBy(acao)
        .isInstanceOf(ExcecaoDeDominio.class)
        .hasMessageContaining(mensagem)
        .extracting(excecao -> ((ExcecaoDeDominio) excecao).getCampo())
        .isEqualTo(Optional.of(campo));
  }

  @Test
  @DisplayName("pouso na mesma hora da partida é recusado no pouso, não vira um voo de 24 h")
  void pousoNaMesmaHora() {
    recusaNoCampo(
        () -> exigirHorarios(null, null, "2026-09-08T13:00:00Z", "2026-09-08T13:00:00Z"),
        "pousoRealizado",
        "depois da partida");
  }

  @Test
  @DisplayName("o realizado vem inteiro: a metade é recusada no campo que falta")
  void realizadoPelaMetade() {
    recusaNoCampo(
        () -> exigirHorarios(null, null, null, "2026-09-08T13:00:00Z"),
        "partidaRealizada",
        "partida realizada");
    recusaNoCampo(
        () -> exigirHorarios(null, null, "2026-09-08T13:00:00Z", null),
        "pousoRealizado",
        "pouso realizado");
  }

  @Test
  @DisplayName("o previsto pode vir pela metade, mas não passa de 24 h nem se afasta da data")
  void previsto() {
    assertThatCode(() -> exigirHorarios("2026-09-08T13:00:00Z", null, null, null))
        .doesNotThrowAnyException();
    recusaNoCampo(
        () -> exigirHorarios("2026-09-08T10:00:00Z", "2026-10-08T10:00:00Z", null, null),
        "pousoPrevisto",
        "24 h");
    recusaNoCampo(
        () -> exigirHorarios("2031-01-01T10:00:00Z", "2031-01-01T11:00:00Z", null, null),
        "partidaPrevista",
        "1 dia");
  }

  @Test
  @DisplayName("horário realizado no futuro é recusado; a folga do relógio de bordo é de 15 min")
  void realizadoNoFuturo() {
    Trecho noLimite =
        new Trecho(
            1L,
            dados("2026-09-10", null, null, "2026-09-10T11:15:00Z", "2026-09-10T12:15:00Z"),
            AGORA);
    Trecho depoisDoLimite =
        new Trecho(
            1L,
            dados("2026-09-10", null, null, "2026-09-10T11:16:00Z", "2026-09-10T12:16:00Z"),
            AGORA);

    assertThatCode(() -> validacao.exigirHorariosCoerentes(noLimite, AGORA))
        .doesNotThrowAnyException();
    recusaNoCampo(
        () -> validacao.exigirHorariosCoerentes(depoisDoLimite, AGORA), "pousoRealizado", "futuro");
  }

  @Test
  @DisplayName("a data fora da janela é recusada dizendo os limites")
  void dataForaDaJanela() {
    Trecho planejadoAntigo = new Trecho(1L, dados("2024-09-08", null, null, null, null), AGORA);
    Trecho realizadoEm2099 =
        new Trecho(
            1L,
            dados("2099-01-01", null, null, "2099-01-01T10:00:00Z", "2099-01-01T11:00:00Z"),
            AGORA);
    Trecho realizadoEm2001 =
        new Trecho(
            1L,
            dados("2001-03-01", null, null, "2001-03-01T10:00:00Z", "2001-03-01T11:00:00Z"),
            AGORA);

    recusaNoCampo(
        () -> validacao.exigirDataNaJanela(planejadoAntigo, HOJE),
        "data",
        "de 10/09/2025 a 10/09/2036");
    recusaNoCampo(
        () -> validacao.exigirDataNaJanela(realizadoEm2099, HOJE),
        "data",
        "de 01/01/2000 a 10/09/2026");
    assertThatCode(() -> validacao.exigirDataNaJanela(realizadoEm2001, HOJE))
        .doesNotThrowAnyException();
  }

  @Test
  @DisplayName("a atribuição recusada aponta o campo: inexistente, inativo ou de fora da aeronave")
  void atribuicao() {
    recusaNoCampo(
        () -> validacao.exigirAtribuicaoValida(1L, 99L), "proprietarioId", "não encontrado");
    when(participantes.participaOuParticipou(1L, 7L)).thenReturn(false);
    recusaNoCampo(
        () -> validacao.exigirAtribuicaoValida(1L, 7L), "proprietarioId", "nunca participou");
    ricardo.desativar(AGORA);
    recusaNoCampo(() -> validacao.exigirAtribuicaoValida(1L, 7L), "proprietarioId", "inativo");
    assertThatCode(() -> validacao.exigirAtribuicaoValida(1L, null)).doesNotThrowAnyException();
  }
}
