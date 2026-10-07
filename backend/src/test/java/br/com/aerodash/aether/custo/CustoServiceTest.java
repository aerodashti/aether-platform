package br.com.aerodash.aether.custo;

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
@DisplayName("CustoService")
class CustoServiceTest {

  private static final Instant AGORA = Instant.parse("2026-09-10T12:00:00Z");

  @Mock private CustoRepository custos;
  @Mock private AeronaveRepository aeronaves;
  @Mock private ProprietarioRepository proprietarios;
  @Mock private ParticipantesDoCusto participantes;
  @Mock private ContextoDaRequisicao contexto;

  private CustoService service;
  private Proprietario ricardo;

  @BeforeEach
  void montar() {
    service =
        new CustoService(
            custos,
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
    ricardo = new Proprietario("Ricardo", null, null, null, CorDeIdentificacao.PETROLEO, AGORA);
    ReflectionTestUtils.setField(ricardo, "id", 7L);

    when(aeronaves.existsById(1L)).thenReturn(true);
    when(aeronaves.findAllById(any())).thenReturn(List.of(aeronave));
    when(proprietarios.findById(7L)).thenReturn(Optional.of(ricardo));
    when(proprietarios.findAllById(any())).thenReturn(List.of(ricardo));
    when(custos.save(any())).thenAnswer(chamada -> chamada.getArgument(0));
    when(participantes.participaOuParticipou(1L, 7L)).thenReturn(true);
  }

  private CustoRequest request(MoedaDoCusto moeda, BigDecimal cambio, Long dono) {
    return request(moeda, new BigDecimal("1200.00"), cambio, dono, "2026-09-08");
  }

  private CustoRequest request(
      MoedaDoCusto moeda, BigDecimal valor, BigDecimal cambio, Long dono, String data) {
    return new CustoRequest(
        1L,
        CategoriaDeCusto.ABASTECIMENTO,
        LocalDate.parse(data),
        "Jet A-1",
        "RV-2026-041",
        dono,
        "NF 1",
        moeda,
        valor,
        cambio);
  }

  /** A recusa nomeia o campo do JSON: é por ele que a tela marca o campo certo. */
  private static void recusadoNoCampo(ThrowingCallable acao, String campo) {
    assertThatThrownBy(acao)
        .isInstanceOfSatisfying(
            CustoInvalidoException.class, recusa -> assertThat(recusa.getCampo()).contains(campo));
  }

  private Custo salvoPara(Long dono) {
    Custo salvo = new Custo(1L, service0(request(MoedaDoCusto.BRL, null, dono)), AGORA);
    when(custos.findById(5L)).thenReturn(Optional.of(salvo));
    return salvo;
  }

  @Test
  @DisplayName("USD sem câmbio e BRL com câmbio são recusados no campo câmbio, antes de salvar")
  void coerenciaDeCambio() {
    recusadoNoCampo(() -> service.criar(request(MoedaDoCusto.USD, null, null)), "cambio");
    recusadoNoCampo(() -> service.criar(request(MoedaDoCusto.BRL, BigDecimal.ONE, null)), "cambio");
    verify(custos, never()).save(any());
  }

  @Test
  @DisplayName("aeronave ou proprietário que não existem são recusa do campo, não 404")
  void idDoCorpoInexistente() {
    when(aeronaves.existsById(1L)).thenReturn(false);
    recusadoNoCampo(() -> service.criar(request(MoedaDoCusto.BRL, null, null)), "aeronaveId");

    when(aeronaves.existsById(1L)).thenReturn(true);
    when(proprietarios.findById(99L)).thenReturn(Optional.empty());
    recusadoNoCampo(() -> service.criar(request(MoedaDoCusto.BRL, null, 99L)), "proprietarioId");
    verify(custos, never()).save(any());
  }

  @Test
  @DisplayName("a data vai de 01/01/2000 até 31 dias à frente de hoje")
  void janelaDaData() {
    BigDecimal valor = BigDecimal.TEN;
    recusadoNoCampo(
        () -> service.criar(request(MoedaDoCusto.BRL, valor, null, null, "1999-12-31")), "data");
    recusadoNoCampo(
        () -> service.criar(request(MoedaDoCusto.BRL, valor, null, null, "2026-10-12")), "data");
    verify(custos, never()).save(any());

    CustoResponse noLimite =
        service.criar(request(MoedaDoCusto.BRL, valor, null, null, "2026-10-11"));
    assertThat(noLimite.data()).isEqualTo(LocalDate.parse("2026-10-11"));
  }

  @Test
  @DisplayName("o BRL convertido que passa da coluna é recusado no valor, não estoura no banco")
  void valorConvertidoAcimaDaColuna() {
    recusadoNoCampo(
        () ->
            service.criar(
                request(
                    MoedaDoCusto.USD,
                    new BigDecimal("10000000000.00"),
                    new BigDecimal("100"),
                    null,
                    "2026-09-08")),
        "valor");
    verify(custos, never()).save(any());
  }

  @Test
  @DisplayName("USD converte no ato e a linha sai com o BRL derivado")
  void usdConvertido() {
    CustoResponse criado = service.criar(request(MoedaDoCusto.USD, new BigDecimal("4.9223"), 7L));

    assertThat(criado.valor()).isEqualByComparingTo("5906.76");
    assertThat(criado.valorOriginal()).isEqualByComparingTo("1200.00");
    assertThat(criado.nomeDoProprietario()).isEqualTo("Ricardo");
  }

  @Test
  @DisplayName("proprietário inativo não recebe atribuição de custo")
  void recusaInativo() {
    ricardo.desativar(AGORA);

    assertThatThrownBy(() -> service.criar(request(MoedaDoCusto.BRL, null, 7L)))
        .isInstanceOf(CustoInvalidoException.class)
        .hasMessageContaining("Ricardo");
    recusadoNoCampo(() -> service.criar(request(MoedaDoCusto.BRL, null, 7L)), "proprietarioId");
  }

  @Test
  @DisplayName("quem nunca participou da aeronave não recebe o custo: o fechamento o cobraria")
  void recusaQuemNuncaParticipou() {
    when(participantes.participaOuParticipou(1L, 7L)).thenReturn(false);

    assertThatThrownBy(() -> service.criar(request(MoedaDoCusto.BRL, null, 7L)))
        .isInstanceOf(CustoInvalidoException.class)
        .hasMessage(
            "Ricardo nunca participou desta aeronave: inclua no contrato quem vai pagar ou rateie"
                + " o custo.");
    verify(custos, never()).save(any());
  }

  @Test
  @DisplayName("a correção mantém a atribuição a quem ficou inativo: o histórico não muda de dono")
  void correcaoMantemInativo() {
    salvoPara(7L);
    ricardo.desativar(AGORA);

    CustoResponse corrigido = service.atualizar(5L, request(MoedaDoCusto.BRL, null, 7L));

    assertThat(corrigido.proprietarioId()).isEqualTo(7L);
    verify(participantes, never()).participaOuParticipou(any(), any());
  }

  @Test
  @DisplayName("na correção, mudar a atribuição para um inativo é recusado no campo")
  void correcaoParaInativo() {
    salvoPara(null);
    ricardo.desativar(AGORA);

    recusadoNoCampo(
        () -> service.atualizar(5L, request(MoedaDoCusto.BRL, null, 7L)), "proprietarioId");
  }

  @Test
  @DisplayName("a aeronave do lançamento não muda numa correção")
  void naoTrocaDeAeronave() {
    Custo salvo =
        new Custo(
            1L,
            new DadosDoCusto(
                CategoriaDeCusto.HANGARAGEM,
                LocalDate.parse("2026-09-01"),
                "Hangaragem",
                null,
                null,
                null,
                MoedaDoCusto.BRL,
                BigDecimal.TEN,
                null),
            AGORA);
    when(custos.findById(5L)).thenReturn(Optional.of(salvo));

    CustoRequest deOutra =
        new CustoRequest(
            2L,
            CategoriaDeCusto.HANGARAGEM,
            LocalDate.parse("2026-09-01"),
            "Hangaragem",
            null,
            null,
            null,
            MoedaDoCusto.BRL,
            BigDecimal.TEN,
            null);

    recusadoNoCampo(() -> service.atualizar(5L, deOutra), "aeronaveId");
  }

  @Test
  @DisplayName("os totais separam fixos de variáveis, em BRL")
  void totais() {
    Custo fixo =
        new Custo(
            1L,
            new DadosDoCusto(
                CategoriaDeCusto.HANGARAGEM,
                LocalDate.parse("2026-09-01"),
                "Hangaragem",
                null,
                null,
                null,
                MoedaDoCusto.BRL,
                new BigDecimal("18400.00"),
                null),
            AGORA);
    Custo variavel =
        new Custo(1L, service0(request(MoedaDoCusto.USD, new BigDecimal("4.9223"), null)), AGORA);
    when(custos.findByAeronaveIdAndDataBetweenOrderByDataDescIdDesc(
            1L, LocalDate.parse("2026-09-01"), LocalDate.parse("2026-09-30")))
        .thenReturn(List.of(fixo, variavel));

    LancamentosResponse lista = service.listar(1L, YearMonth.parse("2026-09"));

    assertThat(lista.totais().fixos()).isEqualByComparingTo("18400.00");
    assertThat(lista.totais().variaveis()).isEqualByComparingTo("5906.76");
    assertThat(lista.totais().total()).isEqualByComparingTo("24306.76");
  }

  private DadosDoCusto service0(CustoRequest request) {
    return new DadosDoCusto(
        request.categoria(),
        request.data(),
        request.descricao(),
        request.relatorioDeVoo(),
        request.proprietarioId(),
        request.notaFiscal(),
        request.moeda(),
        request.valor(),
        request.cambio());
  }
}
