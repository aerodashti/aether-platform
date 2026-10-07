package br.com.aerodash.aether.participacao;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.com.aerodash.aether.aeronave.Aeronave;
import br.com.aerodash.aether.aeronave.AeronaveRepository;
import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
import br.com.aerodash.aether.comum.erro.RecursoNaoEncontradoException;
import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import br.com.aerodash.aether.participacao.DefinirContratoRequest.ParticipacaoRequest;
import br.com.aerodash.aether.proprietario.CorDeIdentificacao;
import br.com.aerodash.aether.proprietario.Proprietario;
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
@DisplayName("ParticipacaoService")
class ParticipacaoServiceTest {

  private static final Instant AGORA = Instant.parse("2026-09-10T12:00:00Z");
  private static final Long AERONAVE = 1L;
  private static final Long VIGENTE = 10L;

  @Mock private ContratoDeParticipacaoRepository contratos;
  @Mock private AeronaveRepository aeronaves;
  @Mock private ProprietarioRepository proprietarios;
  @Mock private ContextoDaRequisicao contexto;

  private ParticipacaoService service;

  @BeforeEach
  void montar() {
    service =
        new ParticipacaoService(
            contratos, aeronaves, proprietarios, Clock.fixed(AGORA, ZoneOffset.UTC), contexto);
    when(aeronaves.findById(AERONAVE)).thenReturn(Optional.of(aeronave(AERONAVE, "PS-MEP")));
    when(contratos.findByAeronaveIdAndFimDaVigenciaIsNotNullOrderByFimDaVigenciaDesc(AERONAVE))
        .thenReturn(List.of());
    when(contratos.save(any())).thenAnswer(chamada -> chamada.getArgument(0));
  }

  private Proprietario dono(Long id, String nome, boolean ativo) {
    Proprietario proprietario =
        new Proprietario(nome, null, null, null, CorDeIdentificacao.PETROLEO, AGORA);
    ReflectionTestUtils.setField(proprietario, "id", id);
    if (!ativo) {
      proprietario.desativar(AGORA);
    }
    return proprietario;
  }

  private static Aeronave aeronave(Long id, String matricula) {
    Aeronave aeronave =
        new Aeronave(
            matricula, "AW109", "SBSP", LocalDate.of(2027, 1, 1), LocalDate.of(2027, 1, 1), AGORA);
    ReflectionTestUtils.setField(aeronave, "id", id);
    return aeronave;
  }

  /** O pedido de quem abriu a edição sem contrato vigente. */
  private DefinirContratoRequest pedido(Object... pares) {
    return pedidoSobre(null, pares);
  }

  /** O pedido de quem abriu a edição com o vigente {@code contratoVigenteId} à vista. */
  private DefinirContratoRequest pedidoSobre(Long contratoVigenteId, Object... pares) {
    var lista = new java.util.ArrayList<ParticipacaoRequest>();
    for (int i = 0; i < pares.length; i += 2) {
      lista.add(new ParticipacaoRequest((Long) pares[i], new BigDecimal((String) pares[i + 1])));
    }
    return new DefinirContratoRequest(lista, contratoVigenteId);
  }

  private ContratoDeParticipacao vigenteSoDoRicardo() {
    ContratoDeParticipacao vigente = new ContratoDeParticipacao(AERONAVE, "L", AGORA);
    ReflectionTestUtils.setField(vigente, "id", VIGENTE);
    vigente.adicionarParticipacao(1L, new BigDecimal("100.00"));
    return vigente;
  }

  private static Optional<String> campoDe(Throwable excecao) {
    return ((ExcecaoDeDominio) excecao).getCampo();
  }

  @Test
  @DisplayName("define o primeiro contrato quando a soma fecha")
  void definePrimeiroContrato() {
    when(proprietarios.findAllById(List.of(1L, 2L)))
        .thenReturn(List.of(dono(1L, "Ricardo", true), dono(2L, "Vetor", true)));
    when(contratos.findByAeronaveIdAndFimDaVigenciaIsNull(AERONAVE)).thenReturn(Optional.empty());

    service.definir(AERONAVE, pedido(1L, "60.00", 2L, "40.00"), "Leonardo");

    verify(contratos).save(any());
  }

  @Test
  @DisplayName("soma diferente de 100 é recusada antes de tocar o banco, com a soma em pt-BR")
  void recusaSomaErrada() {
    when(proprietarios.findAllById(List.of(1L, 2L)))
        .thenReturn(List.of(dono(1L, "Ricardo", true), dono(2L, "Vetor", true)));

    assertThatThrownBy(() -> service.definir(AERONAVE, pedido(1L, "60.00", 2L, "39.99"), "L"))
        .isInstanceOf(ContratoInvalidoException.class)
        .hasMessage("Ajuste os percentuais para somar 100% — a soma atual é 99,99%.")
        .satisfies(excecao -> assertThat(campoDe(excecao)).contains("participacoes"));
    verify(contratos, never()).save(any());
  }

  @Test
  @DisplayName("proprietário repetido, inativo ou desconhecido é recusado no campo da linha")
  void recusaProprietarioInvalido() {
    assertThatThrownBy(() -> service.definir(AERONAVE, pedido(1L, "50.00", 1L, "50.00"), "L"))
        .isInstanceOf(ContratoInvalidoException.class)
        .satisfies(
            excecao -> assertThat(campoDe(excecao)).contains("participacoes[1].proprietarioId"));

    when(proprietarios.findAllById(List.of(3L))).thenReturn(List.of(dono(3L, "Otávio", false)));
    assertThatThrownBy(() -> service.definir(AERONAVE, pedido(3L, "100.00"), "L"))
        .isInstanceOf(ContratoInvalidoException.class)
        .hasMessageContaining("Otávio")
        .satisfies(
            excecao -> assertThat(campoDe(excecao)).contains("participacoes[0].proprietarioId"));

    // O id veio no corpo: é campo errado do pedido (400), não recurso da URL que falta (404).
    when(proprietarios.findAllById(List.of(1L, 9L))).thenReturn(List.of(dono(1L, "R", true)));
    assertThatThrownBy(() -> service.definir(AERONAVE, pedido(1L, "50.00", 9L, "50.00"), "L"))
        .isInstanceOf(ContratoInvalidoException.class)
        .hasMessage("Proprietário não encontrado.")
        .satisfies(
            excecao -> assertThat(campoDe(excecao)).contains("participacoes[1].proprietarioId"));
  }

  @Test
  @DisplayName("na saída, a recusa aponta o campo dentro do contrato da aeronave")
  void recusaComPrefixoDaSaida() {
    assertThatThrownBy(
            () -> service.definir(AERONAVE, pedido(1L, "50.00", 1L, "50.00"), "L", "contratos[2]."))
        .satisfies(
            excecao ->
                assertThat(campoDe(excecao))
                    .contains("contratos[2].participacoes[1].proprietarioId"));
  }

  @Test
  @DisplayName("contrato idêntico ao vigente não arquiva nada")
  void contratoIgualNaoArquiva() {
    ContratoDeParticipacao vigente = vigenteSoDoRicardo();
    when(contratos.findByAeronaveIdAndFimDaVigenciaIsNull(AERONAVE))
        .thenReturn(Optional.of(vigente));
    when(proprietarios.findAllById(List.of(1L))).thenReturn(List.of(dono(1L, "Ricardo", true)));

    service.definir(AERONAVE, pedidoSobre(VIGENTE, 1L, "100.00"), "L");

    assertThat(vigente.estaVigente()).isTrue();
    verify(contratos, never()).save(any());
  }

  @Test
  @DisplayName("contrato diferente arquiva o vigente no mesmo instante")
  void contratoNovoArquivaOVigente() {
    ContratoDeParticipacao vigente = vigenteSoDoRicardo();
    when(contratos.findByAeronaveIdAndFimDaVigenciaIsNull(AERONAVE))
        .thenReturn(Optional.of(vigente));
    when(proprietarios.findAllById(List.of(1L, 2L)))
        .thenReturn(List.of(dono(1L, "Ricardo", true), dono(2L, "Vetor", true)));

    service.definir(AERONAVE, pedidoSobre(VIGENTE, 1L, "60.00", 2L, "40.00"), "L");

    assertThat(vigente.estaVigente()).isFalse();
    assertThat(vigente.getFimDaVigencia()).isEqualTo(AGORA);
    verify(contratos).save(any());
  }

  @Test
  @DisplayName("se outro contrato entrou em vigor desde que a edição abriu, nada é arquivado")
  void recusaEdicaoDesatualizada() {
    ContratoDeParticipacao vigente = vigenteSoDoRicardo();
    when(contratos.findByAeronaveIdAndFimDaVigenciaIsNull(AERONAVE))
        .thenReturn(Optional.of(vigente));
    when(proprietarios.findAllById(List.of(1L, 2L)))
        .thenReturn(List.of(dono(1L, "Ricardo", true), dono(2L, "Vetor", true)));

    // A edição viu o contrato 9, ou nenhum: o 10 entrou no meio do caminho.
    for (Long visto : new Long[] {9L, null}) {
      assertThatThrownBy(
              () -> service.definir(AERONAVE, pedidoSobre(visto, 1L, "60.00", 2L, "40.00"), "L"))
          .isInstanceOf(ContratoDesatualizadoException.class)
          .hasMessageContaining("PS-MEP");
    }
    assertThat(vigente.estaVigente()).isTrue();
    verify(contratos, never()).save(any());
  }

  @Test
  @DisplayName("aeronave desconhecida é 404")
  void aeronaveDesconhecida() {
    when(aeronaves.findById(99L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.consultar(99L))
        .isInstanceOf(RecursoNaoEncontradoException.class);
  }

  @Test
  @DisplayName("lista os vínculos vigentes com a matrícula, em ordem de matrícula e de fatia")
  void listaVinculosVigentes() {
    ContratoDeParticipacao doJato = new ContratoDeParticipacao(1L, "Leonardo", AGORA);
    doJato.adicionarParticipacao(1L, new BigDecimal("40.00"));
    doJato.adicionarParticipacao(2L, new BigDecimal("60.00"));
    ContratoDeParticipacao doHelicoptero = new ContratoDeParticipacao(2L, "Leonardo", AGORA);
    doHelicoptero.adicionarParticipacao(1L, new BigDecimal("100.00"));
    when(contratos.findByFimDaVigenciaIsNull()).thenReturn(List.of(doJato, doHelicoptero));

    Aeronave jato =
        new Aeronave(
            "PS-AER",
            "Phenom 300E",
            "SBSP",
            LocalDate.of(2027, 1, 1),
            LocalDate.of(2027, 1, 1),
            AGORA);
    ReflectionTestUtils.setField(jato, "id", 1L);
    Aeronave helicoptero =
        new Aeronave(
            "PR-HEL", "AW109", "SBSP", LocalDate.of(2027, 1, 1), LocalDate.of(2027, 1, 1), AGORA);
    ReflectionTestUtils.setField(helicoptero, "id", 2L);
    when(aeronaves.findAllById(List.of(1L, 2L))).thenReturn(List.of(jato, helicoptero));

    List<VinculoVigenteResponse> vinculos = service.listarVinculosVigentes();

    assertThat(vinculos)
        .extracting(
            VinculoVigenteResponse::matricula,
            VinculoVigenteResponse::proprietarioId,
            VinculoVigenteResponse::percentual)
        .containsExactly(
            tuple("PR-HEL", 1L, new BigDecimal("100.00")),
            tuple("PS-AER", 2L, new BigDecimal("60.00")),
            tuple("PS-AER", 1L, new BigDecimal("40.00")));
    assertThat(vinculos.get(0).modelo()).isEqualTo("AW109");
  }
}
