package br.com.aerodash.aether.voo;

import br.com.aerodash.aether.aeronave.Aeronave;
import br.com.aerodash.aether.aeronave.AeronaveRepository;
import br.com.aerodash.aether.aeronave.FiltroPorAeronave;
import br.com.aerodash.aether.comum.config.FusoDoNegocio;
import br.com.aerodash.aether.comum.erro.RecursoNaoEncontradoException;
import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import br.com.aerodash.aether.proprietario.Proprietario;
import br.com.aerodash.aether.proprietario.ProprietarioRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * O diário de voos. Cada lançamento alimenta os contadores da aeronave — horas de célula, km e
 * pousos — e cada correção ou exclusão estorna antes de reaplicar: o contador é consequência do
 * diário, nunca uma segunda fonte da verdade.
 *
 * <p>Toda escrita trava a linha da aeronave antes de ler os contadores, e a correção e a exclusão
 * travam também a do trecho: lançamentos simultâneos na mesma aeronave passam um de cada vez.
 */
@Service
public class VooService {

  private final TrechoRepository trechos;
  private final AeronaveRepository aeronaves;
  private final ProprietarioRepository proprietarios;
  private final ValidacaoDoTrecho validacao;
  private final Clock relogio;
  private final ContextoDaRequisicao contexto;

  public VooService(
      TrechoRepository trechos,
      AeronaveRepository aeronaves,
      ProprietarioRepository proprietarios,
      ValidacaoDoTrecho validacao,
      Clock relogio,
      ContextoDaRequisicao contexto) {
    this.trechos = trechos;
    this.aeronaves = aeronaves;
    this.proprietarios = proprietarios;
    this.validacao = validacao;
    this.relogio = relogio;
    this.contexto = contexto;
  }

  @Transactional(readOnly = true)
  public DiarioDeVoosResponse listar(Long aeronaveId, YearMonth competencia) {
    contexto.decisao("voos.filtroPorCompetencia", competencia != null);
    FiltroPorAeronave.exigirExistente("voos", aeronaveId, aeronaves::existsById, contexto);
    List<Trecho> recorte = recorteDe(aeronaveId, competencia);

    contexto.registrar("voos.trechos", recorte.size());
    return new DiarioDeVoosResponse(paraLinhas(recorte), totaisDe(recorte));
  }

  private List<Trecho> recorteDe(Long aeronaveId, YearMonth competencia) {
    if (aeronaveId != null && competencia != null) {
      return trechos
          .findByAeronaveIdAndDataBetweenOrderByDataDescRelatorioDeVooDescNumeroDoTrechoDesc(
              aeronaveId, competencia.atDay(1), competencia.atEndOfMonth());
    }
    if (aeronaveId != null) {
      return trechos.findByAeronaveIdOrderByDataDescRelatorioDeVooDescNumeroDoTrechoDesc(
          aeronaveId);
    }
    if (competencia != null) {
      return trechos.findByDataBetweenOrderByDataDescRelatorioDeVooDescNumeroDoTrechoDesc(
          competencia.atDay(1), competencia.atEndOfMonth());
    }
    return trechos.findAllByOrderByDataDescRelatorioDeVooDescNumeroDoTrechoDesc();
  }

  @Transactional
  public TrechoResponse criar(TrechoRequest request) {
    Aeronave aeronave = travarAeronave(request.aeronaveId());
    validacao.exigirAtribuicaoValida(aeronave.getId(), request.proprietarioId());
    Instant agora = Instant.now(relogio);
    Trecho trecho = new Trecho(aeronave.getId(), dadosDe(request), agora);
    validacao.exigirHorariosCoerentes(trecho, agora);
    validacao.exigirDataNaJanela(trecho, FusoDoNegocio.dataDe(agora));
    trecho = trechos.save(trecho);

    somarNosContadores(aeronave, trecho, 1, agora);
    contexto.registrar("trecho.id", trecho.getId());
    return paraLinhas(List.of(trecho)).get(0);
  }

  /**
   * Corrige o trecho. O que não mudou não é julgado de novo: a atribuição a quem ficou inativo
   * continua (decisão de produto D12) e a data de um planejado antigo não barra a correção das
   * observações. Uma recusa depois do estorno desfaz tudo com a transação.
   */
  @Transactional
  public TrechoResponse atualizar(Long id, TrechoRequest request) {
    Trecho trecho = travarTrecho(id);
    exigirMesmaAeronave(trecho, request.aeronaveId());

    boolean atribuicaoMudou = !Objects.equals(request.proprietarioId(), trecho.getProprietarioId());
    contexto.decisao("trecho.atribuicaoMudou", atribuicaoMudou);
    if (atribuicaoMudou) {
      validacao.exigirAtribuicaoValida(trecho.getAeronaveId(), request.proprietarioId());
    }
    Aeronave aeronave = travarAeronave(trecho.getAeronaveId());
    DadosDoTrecho dados = dadosDe(request);
    boolean dataMudou = !Objects.equals(dados.data(), trecho.getData());

    Instant agora = Instant.now(relogio);
    somarNosContadores(aeronave, trecho, -1, agora);
    trecho.atualizar(dados, agora);
    validacao.exigirHorariosCoerentes(trecho, agora);
    contexto.decisao("trecho.dataMudou", dataMudou);
    if (dataMudou) {
      validacao.exigirDataNaJanela(trecho, FusoDoNegocio.dataDe(agora));
    }
    somarNosContadores(aeronave, trecho, 1, agora);
    return paraLinhas(List.of(trecho)).get(0);
  }

  @Transactional
  public void excluir(Long id) {
    Trecho trecho = travarTrecho(id);
    Aeronave aeronave = travarAeronave(trecho.getAeronaveId());

    somarNosContadores(aeronave, trecho, -1, Instant.now(relogio));
    trechos.delete(trecho);
    contexto.registrar("trecho.excluido", id);
  }

  /**
   * A aeronave do trecho não muda numa correção: os contadores dela já contam este voo, e a troca
   * silenciosa deixaria as duas erradas. Corrigir aeronave é excluir e relançar.
   */
  private void exigirMesmaAeronave(Trecho trecho, Long aeronaveId) {
    boolean trocaDeAeronave = !Objects.equals(aeronaveId, trecho.getAeronaveId());
    contexto.decisao("trecho.trocaDeAeronave", trocaDeAeronave);
    if (trocaDeAeronave) {
      throw new VooInvalidoException(
          "A aeronave do trecho não muda: exclua o lançamento e relance na aeronave certa.",
          "aeronaveId");
    }
  }

  /** A aeronave vem do corpo: a que não existe é um campo errado (400), não uma rota (404). */
  private Aeronave travarAeronave(Long aeronaveId) {
    contexto.registrar("aeronave.id", aeronaveId);
    return aeronaves
        .findTravadaById(aeronaveId)
        .orElseThrow(() -> new VooInvalidoException("Aeronave não encontrada.", "aeronaveId"));
  }

  private Trecho travarTrecho(Long id) {
    contexto.registrar("trecho.id", id);
    return trechos
        .findTravadoById(id)
        .orElseThrow(() -> new RecursoNaoEncontradoException("Trecho não encontrado."));
  }

  /**
   * Soma (sinal 1) ou estorna (sinal -1) o trecho nos contadores — só se ele foi realizado. Trecho
   * planejado não gastou célula, ciclo nem quilômetro; ao receber os horários realizados, a
   * correção estorna o nada de antes e soma o voo de agora.
   */
  private void somarNosContadores(Aeronave aeronave, Trecho trecho, int sinal, Instant agora) {
    boolean realizado = trecho.estaRealizado();
    contexto.decisao("trecho.realizado", realizado);
    if (!realizado) {
      return;
    }
    BigDecimal fator = BigDecimal.valueOf(sinal);
    aeronave.acumularVoo(
        trecho.horasParaContadores().multiply(fator), trecho.getKm().multiply(fator), sinal, agora);
  }

  private DadosDoTrecho dadosDe(TrechoRequest request) {
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

  /** Nome, cor e matrícula em lote: a grade não faz uma busca por linha. */
  private List<TrechoResponse> paraLinhas(List<Trecho> recorte) {
    Map<Long, Aeronave> frota =
        aeronaves
            .findAllById(recorte.stream().map(Trecho::getAeronaveId).distinct().toList())
            .stream()
            .collect(Collectors.toMap(Aeronave::getId, Function.identity()));
    Map<Long, Proprietario> donos =
        proprietarios
            .findAllById(
                recorte.stream()
                    .map(Trecho::getProprietarioId)
                    .filter(Objects::nonNull)
                    .distinct()
                    .toList())
            .stream()
            .collect(Collectors.toMap(Proprietario::getId, Function.identity()));

    return recorte.stream().map(trecho -> paraLinha(trecho, frota, donos)).toList();
  }

  private TrechoResponse paraLinha(
      Trecho trecho, Map<Long, Aeronave> frota, Map<Long, Proprietario> donos) {
    Aeronave aeronave = frota.get(trecho.getAeronaveId());
    Proprietario dono =
        trecho.getProprietarioId() == null ? null : donos.get(trecho.getProprietarioId());
    return new TrechoResponse(
        trecho.getId(),
        trecho.getAeronaveId(),
        aeronave == null ? null : aeronave.getMatricula(),
        trecho.getRelatorioDeVoo(),
        trecho.getNumeroDoTrecho(),
        trecho.getData(),
        trecho.getOrigem(),
        trecho.getDestino(),
        trecho.duracaoEmHoras(),
        trecho.getKm(),
        emUtc(trecho.getPartidaPrevista()),
        emUtc(trecho.getPousoPrevisto()),
        emUtc(trecho.getPartidaRealizada()),
        emUtc(trecho.getPousoRealizado()),
        trecho.getProprietarioId(),
        dono == null ? null : dono.getNome(),
        dono == null ? null : dono.getCorDeIdentificacao(),
        trecho.ehVooDeManutencao(),
        trecho.getObservacoes());
  }

  /**
   * Os totais do realizado, o mesmo critério dos contadores: o planejado ainda não gastou hora,
   * quilômetro nem pouso, e somá-lo em parte das colunas fazia a linha não bater com nada.
   */
  private DiarioDeVoosResponse.TotaisDoDiario totaisDe(List<Trecho> recorte) {
    List<Trecho> realizados = recorte.stream().filter(Trecho::estaRealizado).toList();
    BigDecimal horas =
        realizados.stream()
            .map(Trecho::horasParaContadores)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    BigDecimal km = realizados.stream().map(Trecho::getKm).reduce(BigDecimal.ZERO, BigDecimal::add);
    return new DiarioDeVoosResponse.TotaisDoDiario(horas, km, realizados.size());
  }

  private static Instant instante(OffsetDateTime horario) {
    return horario == null ? null : horario.toInstant();
  }

  /** O servidor responde em UTC; quem converte para o fuso de quem olha é a tela. */
  private static OffsetDateTime emUtc(Instant horario) {
    return horario == null ? null : horario.atOffset(ZoneOffset.UTC);
  }
}
