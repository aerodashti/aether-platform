package br.com.aerodash.aether.participacao;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.com.aerodash.aether.aeronave.AeronaveRepository;
import br.com.aerodash.aether.comum.erro.RecursoNaoEncontradoException;
import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import br.com.aerodash.aether.participacao.DefinirContratoRequest.ParticipacaoRequest;
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
@DisplayName("ParticipacaoService")
class ParticipacaoServiceTest {

  private static final Instant AGORA = Instant.parse("2026-09-10T12:00:00Z");
  private static final Long AERONAVE = 1L;

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
    when(aeronaves.existsById(AERONAVE)).thenReturn(true);
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

  private DefinirContratoRequest pedido(Object... pares) {
    var lista = new java.util.ArrayList<ParticipacaoRequest>();
    for (int i = 0; i < pares.length; i += 2) {
      lista.add(new ParticipacaoRequest((Long) pares[i], new BigDecimal((String) pares[i + 1])));
    }
    return new DefinirContratoRequest(lista);
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
  @DisplayName("soma diferente de 100 é recusada antes de tocar o banco")
  void recusaSomaErrada() {
    when(proprietarios.findAllById(List.of(1L, 2L)))
        .thenReturn(List.of(dono(1L, "Ricardo", true), dono(2L, "Vetor", true)));

    assertThatThrownBy(() -> service.definir(AERONAVE, pedido(1L, "60.00", 2L, "39.99"), "L"))
        .isInstanceOf(ContratoInvalidoException.class)
        .hasMessageContaining("99.99");
    verify(contratos, never()).save(any());
  }

  @Test
  @DisplayName("proprietário repetido, inativo ou desconhecido não entra")
  void recusaProprietarioInvalido() {
    when(proprietarios.findAllById(List.of(1L, 1L))).thenReturn(List.of(dono(1L, "R", true)));
    assertThatThrownBy(() -> service.definir(AERONAVE, pedido(1L, "50.00", 1L, "50.00"), "L"))
        .isInstanceOf(ContratoInvalidoException.class);

    when(proprietarios.findAllById(List.of(3L))).thenReturn(List.of(dono(3L, "Otávio", false)));
    assertThatThrownBy(() -> service.definir(AERONAVE, pedido(3L, "100.00"), "L"))
        .isInstanceOf(ContratoInvalidoException.class)
        .hasMessageContaining("Otávio");

    when(proprietarios.findAllById(List.of(9L))).thenReturn(List.of());
    assertThatThrownBy(() -> service.definir(AERONAVE, pedido(9L, "100.00"), "L"))
        .isInstanceOf(RecursoNaoEncontradoException.class);
  }

  @Test
  @DisplayName("contrato idêntico ao vigente não arquiva nada")
  void contratoIgualNaoArquiva() {
    ContratoDeParticipacao vigente = new ContratoDeParticipacao(AERONAVE, "L", AGORA);
    vigente.adicionarParticipacao(1L, new BigDecimal("100.00"));
    when(contratos.findByAeronaveIdAndFimDaVigenciaIsNull(AERONAVE))
        .thenReturn(Optional.of(vigente));
    when(proprietarios.findAllById(List.of(1L))).thenReturn(List.of(dono(1L, "Ricardo", true)));

    service.definir(AERONAVE, pedido(1L, "100.00"), "L");

    assertThat(vigente.estaVigente()).isTrue();
    verify(contratos, never()).save(any());
  }

  @Test
  @DisplayName("contrato diferente arquiva o vigente no mesmo instante")
  void contratoNovoArquivaOVigente() {
    ContratoDeParticipacao vigente = new ContratoDeParticipacao(AERONAVE, "L", AGORA);
    vigente.adicionarParticipacao(1L, new BigDecimal("100.00"));
    when(contratos.findByAeronaveIdAndFimDaVigenciaIsNull(AERONAVE))
        .thenReturn(Optional.of(vigente));
    when(proprietarios.findAllById(List.of(1L, 2L)))
        .thenReturn(List.of(dono(1L, "Ricardo", true), dono(2L, "Vetor", true)));

    service.definir(AERONAVE, pedido(1L, "60.00", 2L, "40.00"), "L");

    assertThat(vigente.estaVigente()).isFalse();
    assertThat(vigente.getFimDaVigencia()).isEqualTo(AGORA);
    verify(contratos).save(any());
  }

  @Test
  @DisplayName("aeronave desconhecida é 404")
  void aeronaveDesconhecida() {
    when(aeronaves.existsById(99L)).thenReturn(false);

    assertThatThrownBy(() -> service.consultar(99L))
        .isInstanceOf(RecursoNaoEncontradoException.class);
  }
}
