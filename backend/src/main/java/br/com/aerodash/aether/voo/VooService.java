package br.com.aerodash.aether.voo;

import br.com.aerodash.aether.aeronave.Aeronave;
import br.com.aerodash.aether.aeronave.AeronaveRepository;
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
 */
@Service
public class VooService {

  private final TrechoRepository trechos;
  private final AeronaveRepository aeronaves;
  private final ProprietarioRepository proprietarios;
  private final ParticipantesDoVoo participantes;
  private final Clock relogio;
  private final ContextoDaRequisicao contexto;

  public VooService(
      TrechoRepository trechos,
      AeronaveRepository aeronaves,
      ProprietarioRepository proprietarios,
      ParticipantesDoVoo participantes,
      Clock relogio,
      ContextoDaRequisicao contexto) {
    this.trechos = trechos;
    this.aeronaves = aeronaves;
    this.proprietarios = proprietarios;
    this.participantes = participantes;
    this.relogio = relogio;
    this.contexto = contexto;
  }

  @Transactional(readOnly = true)
  public DiarioDeVoosResponse listar(Long aeronaveId, YearMonth competencia) {
    contexto.decisao("voos.filtroPorAeronave", aeronaveId != null);
    contexto.decisao("voos.filtroPorCompetencia", competencia != null);
    exigirAeronaveDoFiltro(aeronaveId);
    List<Trecho> recorte = recorteDe(aeronaveId, competencia);

    contexto.registrar("voos.trechos", recorte.size());
    return new DiarioDeVoosResponse(paraLinhas(recorte), totaisDe(recorte));
  }

  /** Filtrar por uma aeronave que não existe é 404: o diário vazio diria "nenhum voo". */
  private void exigirAeronaveDoFiltro(Long aeronaveId) {
    boolean existe = aeronaveId == null || aeronaves.existsById(aeronaveId);
    contexto.decisao("voos.aeronaveDoFiltroExiste", existe);
    if (!existe) {
      throw new RecursoNaoEncontradoException("Aeronave não encontrada.");
    }
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
    Aeronave aeronave = exigirAeronave(request.aeronaveId());
    validarAtribuicao(aeronave.getId(), request.proprietarioId());

    DadosDoTrecho dados = validarHorarios(dadosDe(request));
    Instant agora = Instant.now(relogio);
    Trecho trecho = new Trecho(aeronave.getId(), dados, agora);
    trecho = trechos.save(trecho);

    somarNosContadores(aeronave, trecho, 1, agora);
    contexto.registrar("trecho.id", trecho.getId());
    contexto.decisao("trecho.vooDeManutencao", trecho.ehVooDeManutencao());
    return paraLinhas(List.of(trecho)).get(0);
  }

  @Transactional
  public TrechoResponse atualizar(Long id, TrechoRequest request) {
    Trecho trecho = exigirTrecho(id);

    // A aeronave do trecho não muda numa correção: os contadores dela já contam este voo, e a
    // troca silenciosa deixaria as duas erradas. Corrigir aeronave é excluir e relançar.
    boolean trocaDeAeronave = !Objects.equals(request.aeronaveId(), trecho.getAeronaveId());
    contexto.decisao("trecho.trocaDeAeronave", trocaDeAeronave);
    if (trocaDeAeronave) {
      throw new VooInvalidoException(
          "A aeronave do trecho não muda: exclua o lançamento e relance na aeronave certa.");
    }
    validarAtribuicao(trecho.getAeronaveId(), request.proprietarioId());
    DadosDoTrecho dados = validarHorarios(dadosDe(request));

    Aeronave aeronave = exigirAeronave(trecho.getAeronaveId());
    Instant agora = Instant.now(relogio);
    somarNosContadores(aeronave, trecho, -1, agora);
    trecho.atualizar(dados, agora);
    somarNosContadores(aeronave, trecho, 1, agora);
    return paraLinhas(List.of(trecho)).get(0);
  }

  @Transactional
  public void excluir(Long id) {
    Trecho trecho = exigirTrecho(id);
    Aeronave aeronave = exigirAeronave(trecho.getAeronaveId());

    somarNosContadores(aeronave, trecho, -1, Instant.now(relogio));
    trechos.delete(trecho);
    contexto.registrar("trecho.excluido", id);
  }

  private void validarAtribuicao(Long aeronaveId, Long proprietarioId) {
    if (proprietarioId == null) {
      contexto.decisao("trecho.vooDeManutencao", true);
      return;
    }
    Proprietario proprietario =
        proprietarios
            .findById(proprietarioId)
            .orElseThrow(() -> new RecursoNaoEncontradoException("Proprietário não encontrado."));
    contexto.decisao("trecho.proprietarioAtivo", proprietario.estaAtivo());
    if (!proprietario.estaAtivo()) {
      throw new VooInvalidoException(
          "Proprietário inativo não recebe atribuição de voo: reative "
              + proprietario.getNome()
              + " antes.");
    }
    boolean participa = participantes.participaOuParticipou(aeronaveId, proprietarioId);
    contexto.decisao("trecho.proprietarioParticipa", participa);
    if (!participa) {
      throw new VooInvalidoException(
          proprietario.getNome()
              + " nunca participou desta aeronave: inclua-o no contrato ou lance como manutenção.");
    }
  }

  private Aeronave exigirAeronave(Long aeronaveId) {
    contexto.registrar("aeronave.id", aeronaveId);
    return aeronaves
        .findById(aeronaveId)
        .orElseThrow(() -> new RecursoNaoEncontradoException("Aeronave não encontrada."));
  }

  private Trecho exigirTrecho(Long id) {
    contexto.registrar("trecho.id", id);
    return trechos
        .findById(id)
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

  private DadosDoTrecho validarHorarios(DadosDoTrecho dados) {
    boolean coerentes = Trecho.possuiHorariosCoerentes(dados);
    contexto.decisao("trecho.horariosCoerentes", coerentes);
    if (!coerentes) {
      throw new VooInvalidoException("O pouso precisa ser depois da partida.");
    }
    return dados;
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

  private DiarioDeVoosResponse.TotaisDoDiario totaisDe(List<Trecho> recorte) {
    BigDecimal horas =
        recorte.stream().map(Trecho::horasParaContadores).reduce(BigDecimal.ZERO, BigDecimal::add);
    BigDecimal km = recorte.stream().map(Trecho::getKm).reduce(BigDecimal.ZERO, BigDecimal::add);
    return new DiarioDeVoosResponse.TotaisDoDiario(horas, km, recorte.size());
  }

  private static Instant instante(OffsetDateTime horario) {
    return horario == null ? null : horario.toInstant();
  }

  /** O servidor responde em UTC; quem converte para o fuso de quem olha é a tela. */
  private static OffsetDateTime emUtc(Instant horario) {
    return horario == null ? null : horario.atOffset(ZoneOffset.UTC);
  }
}
