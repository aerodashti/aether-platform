package br.com.aerodash.aether.participacao;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import br.com.aerodash.aether.participacao.DefinirContratoRequest.ParticipacaoRequest;
import br.com.aerodash.aether.participacao.SaidaDeProprietarioRequest.ContratoNovo;
import br.com.aerodash.aether.proprietario.CorDeIdentificacao;
import br.com.aerodash.aether.proprietario.Proprietario;
import br.com.aerodash.aether.proprietario.ProprietarioRepository;
import java.math.BigDecimal;
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
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("SaidaDeProprietarioService")
class SaidaDeProprietarioServiceTest {

  private static final Instant AGORA = Instant.parse("2026-10-07T12:00:00Z");
  private static final Long HELENA = 3L;
  private static final Long RICARDO = 1L;
  private static final Long JATO = 7L;
  private static final Long HELICOPTERO = 8L;

  @Mock private ContratoDeParticipacaoRepository contratos;
  @Mock private ParticipacaoService participacoes;
  @Mock private ProprietarioRepository proprietarios;
  @Mock private ContextoDaRequisicao contexto;

  private SaidaDeProprietarioService service;
  private Proprietario helena;

  @BeforeEach
  void montar() {
    service =
        new SaidaDeProprietarioService(
            contratos, participacoes, proprietarios, Clock.fixed(AGORA, ZoneOffset.UTC), contexto);
    helena = new Proprietario("Helena Sarraf", null, null, null, CorDeIdentificacao.VERDE, AGORA);
    ReflectionTestUtils.setField(helena, "id", HELENA);
    when(proprietarios.findById(HELENA)).thenReturn(Optional.of(helena));
    when(contratos.findByFimDaVigenciaIsNullAndParticipacoesProprietarioId(HELENA))
        .thenReturn(List.of(contratoDe(JATO), contratoDe(HELICOPTERO)));
  }

  private static ContratoDeParticipacao contratoDe(Long aeronaveId) {
    ContratoDeParticipacao contrato = new ContratoDeParticipacao(aeronaveId, "L", AGORA);
    contrato.adicionarParticipacao(HELENA, new BigDecimal("100.00"));
    return contrato;
  }

  private static ContratoNovo novo(Long aeronaveId, Long... donos) {
    return new ContratoNovo(
        aeronaveId,
        aeronaveId * 10,
        List.of(donos).stream()
            .map(dono -> new ParticipacaoRequest(dono, new BigDecimal("100.00")))
            .toList());
  }

  private static Optional<String> campoDe(Throwable excecao) {
    return ((ExcecaoDeDominio) excecao).getCampo();
  }

  @Test
  @DisplayName("redistribui cada aeronave apontando o lugar do contrato no pedido, e desativa")
  void redistribuiEDesativa() {
    service.sair(
        HELENA,
        new SaidaDeProprietarioRequest(List.of(novo(JATO, RICARDO), novo(HELICOPTERO, RICARDO))),
        "Leonardo");

    verify(participacoes)
        .definir(
            eq(JATO),
            eq(new DefinirContratoRequest(novo(JATO, RICARDO).participacoes(), 70L)),
            eq("Leonardo"),
            eq("contratos[0]."));
    verify(participacoes).definir(eq(HELICOPTERO), any(), eq("Leonardo"), eq("contratos[1]."));
    assertThat(helena.estaAtivo()).isFalse();
  }

  @Test
  @DisplayName("quem já está inativo não tem saída a registrar")
  void recusaQuemJaEstaInativo() {
    helena.desativar(AGORA);

    assertThatThrownBy(
            () -> service.sair(HELENA, new SaidaDeProprietarioRequest(List.of()), "Leonardo"))
        .isInstanceOf(ProprietarioJaInativoException.class)
        .hasMessageContaining("Helena Sarraf");
    verify(participacoes, never()).definir(anyLong(), any(), anyString(), anyString());
  }

  @Test
  @DisplayName("aeronave repetida é recusada com mensagem própria, no campo da repetição")
  void recusaAeronaveRepetida() {
    var pedido =
        new SaidaDeProprietarioRequest(
            List.of(novo(JATO, RICARDO), novo(JATO, RICARDO), novo(HELICOPTERO, RICARDO)));

    assertThatThrownBy(() -> service.sair(HELENA, pedido, "Leonardo"))
        .isInstanceOf(ContratoInvalidoException.class)
        .hasMessageContaining("mais de uma vez")
        .satisfies(excecao -> assertThat(campoDe(excecao)).contains("contratos[1].aeronaveId"));
  }

  @Test
  @DisplayName("faltar uma aeronave de quem sai é recusado antes de qualquer contrato novo")
  void recusaAeronaveQueFalta() {
    var pedido = new SaidaDeProprietarioRequest(List.of(novo(JATO, RICARDO)));

    assertThatThrownBy(() -> service.sair(HELENA, pedido, "Leonardo"))
        .isInstanceOf(ContratoInvalidoException.class)
        .hasMessageContaining("cada aeronave em que Helena Sarraf participa");
    verify(participacoes, never()).definir(anyLong(), any(), anyString(), anyString());
  }

  @Test
  @DisplayName("quem sai não continua no contrato novo: a recusa aponta a linha dele")
  void recusaQuemSaiNoContratoNovo() {
    var pedido =
        new SaidaDeProprietarioRequest(
            List.of(novo(JATO, RICARDO), novo(HELICOPTERO, RICARDO, HELENA)));

    assertThatThrownBy(() -> service.sair(HELENA, pedido, "Leonardo"))
        .isInstanceOf(ContratoInvalidoException.class)
        .satisfies(
            excecao ->
                assertThat(campoDe(excecao))
                    .contains("contratos[1].participacoes[1].proprietarioId"));
    assertThat(helena.estaAtivo()).isTrue();
  }
}
