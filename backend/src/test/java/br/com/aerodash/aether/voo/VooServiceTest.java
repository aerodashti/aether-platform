package br.com.aerodash.aether.voo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.com.aerodash.aether.aeronave.Aeronave;
import br.com.aerodash.aether.aeronave.AeronaveRepository;
import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import br.com.aerodash.aether.proprietario.CorDeIdentificacao;
import br.com.aerodash.aether.proprietario.Proprietario;
import br.com.aerodash.aether.proprietario.ProprietarioRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
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
@DisplayName("VooService")
class VooServiceTest {

  private static final Instant AGORA = Instant.parse("2026-09-10T12:00:00Z");

  @Mock private TrechoRepository trechos;
  @Mock private AeronaveRepository aeronaves;
  @Mock private ProprietarioRepository proprietarios;
  @Mock private ParticipantesDoVoo participantes;
  @Mock private ContextoDaRequisicao contexto;

  private VooService service;
  private Aeronave aeronave;
  private Proprietario ricardo;

  @BeforeEach
  void montar() {
    service = servicoEm(AGORA);
    aeronave =
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

    when(aeronaves.findTravadaById(1L)).thenReturn(Optional.of(aeronave));
    when(aeronaves.findAllById(any())).thenReturn(List.of(aeronave));
    when(proprietarios.findById(7L)).thenReturn(Optional.of(ricardo));
    when(proprietarios.findAllById(any())).thenReturn(List.of(ricardo));
    when(trechos.save(any())).thenAnswer(chamada -> chamada.getArgument(0));
    when(participantes.participaOuParticipou(1L, 7L)).thenReturn(true);
  }

  private VooService servicoEm(Instant agora) {
    return new VooService(
        trechos,
        aeronaves,
        proprietarios,
        new ValidacaoDoTrecho(proprietarios, participantes, contexto),
        Clock.fixed(agora, ZoneOffset.UTC), // o relógio do servidor, em UTC como em produção
        contexto);
  }

  private static TrechoRequest request(
      String data, String partida, String pouso, boolean realizado, Long proprietarioId) {
    OffsetDateTime depPrev = partida == null ? null : OffsetDateTime.parse(partida);
    OffsetDateTime arrPrev = pouso == null ? null : OffsetDateTime.parse(pouso);
    return new TrechoRequest(
        1L,
        "RV-2026-041",
        1,
        LocalDate.parse(data),
        "sbsp",
        "sbrj",
        new BigDecimal("365.0"),
        depPrev,
        arrPrev,
        realizado ? depPrev : null,
        realizado ? arrPrev : null,
        proprietarioId,
        null);
  }

  private static TrechoRequest voado(Long proprietarioId) {
    return request(
        "2026-09-08", "2026-09-08T08:30:00Z", "2026-09-08T09:30:00Z", true, proprietarioId);
  }

  private static TrechoRequest planejadoEm(String data) {
    return request(data, data + "T12:00:00Z", data + "T13:00:00Z", false, 7L);
  }

  /** O trecho já gravado, como a correção o encontra. */
  private Trecho salvo(TrechoRequest request) {
    Trecho trecho = new Trecho(1L, dadosDe(request), AGORA);
    ReflectionTestUtils.setField(trecho, "id", 5L);
    when(trechos.findTravadoById(5L)).thenReturn(Optional.of(trecho));
    return trecho;
  }

  private static Instant instante(OffsetDateTime horario) {
    return horario == null ? null : horario.toInstant();
  }

  @Test
  @DisplayName("trecho só previsto não mexe nos contadores: o voo ainda não aconteceu")
  void previstoNaoContaNosContadores() {
    service.criar(planejadoEm("2026-09-20"));

    assertThat(aeronave.getContadores().ciclos()).isZero();
    assertThat(aeronave.getContadores().kmVoados()).isEqualByComparingTo("0");
  }

  @Test
  @DisplayName("lançar alimenta os contadores: horas, km e um pouso")
  void lancarAlimentaContadores() {
    TrechoResponse criado = service.criar(voado(7L));

    assertThat(criado.horas()).isEqualByComparingTo("1.0");
    assertThat(criado.nomeDoProprietario()).isEqualTo("Ricardo");
    assertThat(aeronave.getContadores().horasDeCelula()).isEqualByComparingTo("1.0");
    assertThat(aeronave.getContadores().ciclos()).isEqualTo(1);
    assertThat(aeronave.getContadores().kmVoados()).isEqualByComparingTo("365.0");
  }

  @Test
  @DisplayName("horário incoerente é recusado antes de salvar e sem tocar nos contadores")
  void recusaAntesDeSalvar() {
    TrechoRequest invertido =
        request("2026-09-08", "2026-09-08T13:45:00Z", "2026-09-08T13:00:00Z", true, 7L);

    assertThatThrownBy(() -> service.criar(invertido))
        .isInstanceOf(VooInvalidoException.class)
        .hasMessage("O pouso precisa ser depois da partida.");
    verify(trechos, never()).save(any());
    assertThat(aeronave.getContadores().ciclos()).isZero();
  }

  @Test
  @DisplayName("aeronave que não existe é um campo errado do corpo (400), não uma rota (404)")
  void aeronaveInexistente() {
    when(aeronaves.findTravadaById(1L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.criar(voado(7L)))
        .isInstanceOf(VooInvalidoException.class)
        .extracting(excecao -> ((ExcecaoDeDominio) excecao).getCampo())
        .isEqualTo(Optional.of("aeronaveId"));
  }

  @Test
  @DisplayName("relançar o mesmo trecho do mesmo voo não é bloqueado: duplicidade não barra (D7)")
  void relancarNaoEhBloqueado() {
    service.criar(voado(7L));
    service.criar(voado(7L));

    assertThat(aeronave.getContadores().ciclos()).isEqualTo(2);
  }

  @Test
  @DisplayName("o hoje da janela de data é o do Brasil, não o do relógio em UTC do servidor")
  void hojeNoFusoDaOperacao() {
    // 01:00 em UTC de 08/10 ainda é 22:00 de 07/10 em São Paulo: o mesmo hoje do painel.
    VooService aNoite = servicoEm(Instant.parse("2026-10-08T01:00:00Z"));
    TrechoRequest realizadoAmanha =
        request("2026-10-08", "2026-10-08T00:00:00Z", "2026-10-08T00:30:00Z", true, 7L);

    assertThat(aNoite.criar(planejadoEm("2025-10-07")).data())
        .isEqualTo(LocalDate.parse("2025-10-07"));
    assertThatThrownBy(() -> aNoite.criar(realizadoAmanha))
        .isInstanceOf(VooInvalidoException.class)
        .hasMessage("Use uma data de 01/01/2000 a 07/10/2026.");
  }

  @Test
  @DisplayName("corrigir estorna o velho e aplica o novo")
  void corrigirEstornaEReaplica() {
    service.criar(voado(7L));
    salvo(voado(7L));

    service.atualizar(
        5L, request("2026-09-08", "2026-09-08T09:00:00Z", "2026-09-08T11:40:00Z", true, 7L));

    assertThat(aeronave.getContadores().horasDeCelula()).isEqualByComparingTo("2.7");
    assertThat(aeronave.getContadores().ciclos()).isEqualTo(1);
  }

  @Test
  @DisplayName("excluir estorna tudo")
  void excluirEstorna() {
    service.criar(voado(7L));
    Trecho existente = salvo(voado(7L));

    service.excluir(5L);

    assertThat(aeronave.getContadores().horasDeCelula()).isEqualByComparingTo("0");
    assertThat(aeronave.getContadores().ciclos()).isZero();
    verify(trechos).delete(existente);
  }

  @Test
  @DisplayName("a aeronave do trecho não muda numa correção")
  void naoTrocaDeAeronave() {
    Trecho deOutraAeronave = new Trecho(2L, dadosDe(voado(7L)), AGORA);
    when(trechos.findTravadoById(5L)).thenReturn(Optional.of(deOutraAeronave));

    assertThatThrownBy(() -> service.atualizar(5L, voado(7L)))
        .isInstanceOf(VooInvalidoException.class)
        .extracting(excecao -> ((ExcecaoDeDominio) excecao).getCampo())
        .isEqualTo(Optional.of("aeronaveId"));
  }

  @Test
  @DisplayName("a correção mantém a atribuição a quem ficou inativo; só a troca exige ativo")
  void correcaoMantemAtribuicaoInativa() {
    salvo(voado(7L));
    ricardo.desativar(AGORA);

    TrechoResponse corrigido = service.atualizar(5L, voado(7L));

    assertThat(corrigido.proprietarioId()).isEqualTo(7L);
    Proprietario helena =
        new Proprietario("Helena", null, null, null, CorDeIdentificacao.AZUL, AGORA);
    helena.desativar(AGORA);
    when(proprietarios.findById(8L)).thenReturn(Optional.of(helena));
    assertThatThrownBy(() -> service.atualizar(5L, voado(8L)))
        .isInstanceOf(VooInvalidoException.class)
        .hasMessageContaining("inativo");
  }

  @Test
  @DisplayName("a data de um planejado antigo só é julgada quando a correção a muda")
  void dataSoEhJulgadaQuandoMuda() {
    TrechoRequest antigo = planejadoEm("2024-03-01");
    salvo(antigo);

    service.atualizar(5L, antigo);

    assertThatThrownBy(() -> service.atualizar(5L, planejadoEm("2024-03-02")))
        .isInstanceOf(VooInvalidoException.class)
        .extracting(excecao -> ((ExcecaoDeDominio) excecao).getCampo())
        .isEqualTo(Optional.of("data"));
  }

  @Test
  @DisplayName("os totais somam só o realizado, como os contadores: o planejado não voou")
  void totaisDoRealizado() {
    Trecho voadoComDono = new Trecho(1L, dadosDe(voado(7L)), AGORA);
    Trecho voadoDeManutencao = new Trecho(1L, dadosDe(voado(null)), AGORA);
    Trecho planejado = new Trecho(1L, dadosDe(planejadoEm("2026-09-20")), AGORA);
    when(trechos.findByAeronaveIdAndDataBetweenOrderByDataDescRelatorioDeVooDescNumeroDoTrechoDesc(
            1L, LocalDate.parse("2026-09-01"), LocalDate.parse("2026-09-30")))
        .thenReturn(List.of(voadoComDono, voadoDeManutencao, planejado));
    when(aeronaves.existsById(1L)).thenReturn(true);

    DiarioDeVoosResponse diario = service.listar(1L, YearMonth.parse("2026-09"));

    assertThat(diario.totais().pousos()).isEqualTo(2);
    assertThat(diario.totais().horas()).isEqualByComparingTo("2.0");
    assertThat(diario.totais().km()).isEqualByComparingTo("730.0");
    assertThat(diario.trechos().get(1).vooDeManutencao()).isTrue();
  }

  private static DadosDoTrecho dadosDe(TrechoRequest request) {
    return new DadosDoTrecho(
        request.relatorioDeVoo(),
        request.numeroDoTrecho(),
        request.data(),
        request.origem(),
        request.destino(),
        request.km(),
        instante(request.partidaPrevista()),
        instante(request.pousoPrevisto()),
        instante(request.partidaRealizada()),
        instante(request.pousoRealizado()),
        request.proprietarioId(),
        request.observacoes());
  }
}
