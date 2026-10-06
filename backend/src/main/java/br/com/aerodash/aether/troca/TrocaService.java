package br.com.aerodash.aether.troca;

import br.com.aerodash.aether.aeronave.Aeronave;
import br.com.aerodash.aether.aeronave.AeronaveRepository;
import br.com.aerodash.aether.comum.erro.RecursoNaoEncontradoException;
import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import br.com.aerodash.aether.proprietario.Proprietario;
import br.com.aerodash.aether.proprietario.ProprietarioRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** As trocas de KM: horas cedidas entre proprietários, a devolver. */
@Service
public class TrocaService {

  private final TrocaDeKmRepository trocas;
  private final AeronaveRepository aeronaves;
  private final ProprietarioRepository proprietarios;
  private final ParticipantesDaTroca participantes;
  private final Clock relogio;
  private final ContextoDaRequisicao contexto;

  public TrocaService(
      TrocaDeKmRepository trocas,
      AeronaveRepository aeronaves,
      ProprietarioRepository proprietarios,
      ParticipantesDaTroca participantes,
      Clock relogio,
      ContextoDaRequisicao contexto) {
    this.trocas = trocas;
    this.aeronaves = aeronaves;
    this.proprietarios = proprietarios;
    this.participantes = participantes;
    this.relogio = relogio;
    this.contexto = contexto;
  }

  @Transactional(readOnly = true)
  public TrocasResponse listar(Long aeronaveId, Long proprietarioId, SituacaoDaTroca situacao) {
    contexto.decisao("trocas.filtroPorAeronave", aeronaveId != null);
    contexto.decisao("trocas.filtroPorProprietario", proprietarioId != null);
    List<TrocaDeKm> recorte =
        trocas.findAllByOrderByDataDescIdDesc().stream()
            .filter(troca -> aeronaveId == null || troca.getAeronaveId().equals(aeronaveId))
            .filter(troca -> proprietarioId == null || troca.envolve(proprietarioId))
            .toList();
    long concluidas = recorte.stream().filter(TrocaDeKm::estaConcluida).count();
    SituacaoDaTroca pedida = situacao == null ? SituacaoDaTroca.PENDENTE : situacao;
    List<TrocaDeKm> daSituacao =
        recorte.stream().filter(troca -> troca.getSituacao() == pedida).toList();

    contexto.registrar("trocas.quantidade", daSituacao.size());
    return new TrocasResponse(
        paraLinhas(daSituacao),
        recorte.size() - concluidas,
        concluidas,
        proprietarioId == null ? null : saldoDe(proprietarioId, recorte));
  }

  @Transactional
  public TrocaResponse registrar(TrocaRequest request) {
    exigirAeronave(request.aeronaveId());
    TrocaDeKm troca = new TrocaDeKm(request.aeronaveId(), dadosDe(request), Instant.now(relogio));
    validar(troca);
    troca = trocas.save(troca);
    contexto.registrar("troca.id", troca.getId());
    return paraLinhas(List.of(troca)).get(0);
  }

  @Transactional
  public TrocaResponse atualizar(Long id, TrocaRequest request) {
    TrocaDeKm troca = exigirTroca(id);
    boolean trocaDeAeronave = !Objects.equals(request.aeronaveId(), troca.getAeronaveId());
    contexto.decisao("troca.trocaDeAeronave", trocaDeAeronave);
    if (trocaDeAeronave) {
      throw new TrocaInvalidaException(
          "A aeronave da troca não muda: registre uma nova na aeronave certa.");
    }
    troca.atualizar(dadosDe(request), Instant.now(relogio));
    // Recusar depois de alterar é seguro: a exceção desfaz a transação antes do flush.
    validar(troca);
    return paraLinhas(List.of(troca)).get(0);
  }

  @Transactional
  public TrocaResponse concluir(Long id) {
    TrocaDeKm troca = exigirTroca(id);
    contexto.decisao("troca.jaConcluida", troca.estaConcluida());
    troca.concluir(LocalDate.now(relogio), Instant.now(relogio));
    return paraLinhas(List.of(troca)).get(0);
  }

  @Transactional
  public TrocaResponse reabrir(Long id) {
    TrocaDeKm troca = exigirTroca(id);
    troca.reabrir(Instant.now(relogio));
    return paraLinhas(List.of(troca)).get(0);
  }

  private void validar(TrocaDeKm troca) {
    boolean diferentes = troca.ehEntreProprietariosDiferentes();
    contexto.decisao("troca.entreProprietariosDiferentes", diferentes);
    if (!diferentes) {
      throw new TrocaInvalidaException(
          "Quem cede e quem recebe precisam ser proprietários diferentes.");
    }
    boolean noFuturo = troca.estaNoFuturo(LocalDate.now(relogio));
    contexto.decisao("troca.dataNoFuturo", noFuturo);
    if (noFuturo) {
      throw new TrocaInvalidaException(
          "A troca registra horas já voadas: a data não pode ser futura.");
    }
    for (Long dono : List.of(troca.getCedenteId(), troca.getRecebedorId())) {
      if (!proprietarios.existsById(dono)) {
        throw new RecursoNaoEncontradoException("Proprietário não encontrado.");
      }
      boolean participa = participantes.participaOuParticipou(troca.getAeronaveId(), dono);
      contexto.decisao("troca.proprietarioParticipa", participa);
      if (!participa) {
        throw new TrocaInvalidaException(
            "Só troca horas quem participa ou participou do contrato desta aeronave.");
      }
    }
  }

  private TrocasResponse.SaldoDeHoras saldoDe(Long proprietarioId, List<TrocaDeKm> recorte) {
    BigDecimal horas =
        recorte.stream()
            .map(troca -> troca.horasADevolverPor(proprietarioId))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    return new TrocasResponse.SaldoDeHoras(proprietarioId, horas);
  }

  private DadosDaTroca dadosDe(TrocaRequest request) {
    return new DadosDaTroca(
        request.data(),
        request.cedenteId(),
        request.recebedorId(),
        request.horas(),
        request.km(),
        request.valorPorHora(),
        request.relatorioDeVoo(),
        request.observacao());
  }

  private Aeronave exigirAeronave(Long aeronaveId) {
    contexto.registrar("aeronave.id", aeronaveId);
    return aeronaves
        .findById(aeronaveId)
        .orElseThrow(() -> new RecursoNaoEncontradoException("Aeronave não encontrada."));
  }

  private TrocaDeKm exigirTroca(Long id) {
    contexto.registrar("troca.id", id);
    return trocas
        .findById(id)
        .orElseThrow(() -> new RecursoNaoEncontradoException("Troca não encontrada."));
  }

  /** Aeronave e proprietários em lote: a grade não faz uma busca por linha. */
  private List<TrocaResponse> paraLinhas(List<TrocaDeKm> recorte) {
    Map<Long, Aeronave> frota =
        aeronaves
            .findAllById(recorte.stream().map(TrocaDeKm::getAeronaveId).distinct().toList())
            .stream()
            .collect(Collectors.toMap(Aeronave::getId, Function.identity()));
    Map<Long, Proprietario> donos =
        proprietarios
            .findAllById(
                recorte.stream()
                    .flatMap(troca -> Stream.of(troca.getCedenteId(), troca.getRecebedorId()))
                    .distinct()
                    .toList())
            .stream()
            .collect(Collectors.toMap(Proprietario::getId, Function.identity()));
    return recorte.stream().map(troca -> paraLinha(troca, frota, donos)).toList();
  }

  private static TrocaResponse paraLinha(
      TrocaDeKm troca, Map<Long, Aeronave> frota, Map<Long, Proprietario> donos) {
    Aeronave aeronave = frota.get(troca.getAeronaveId());
    Proprietario cedente = donos.get(troca.getCedenteId());
    Proprietario recebedor = donos.get(troca.getRecebedorId());
    return new TrocaResponse(
        troca.getId(),
        troca.getAeronaveId(),
        aeronave == null ? null : aeronave.getMatricula(),
        aeronave == null ? null : aeronave.getModelo(),
        troca.getData(),
        troca.getCedenteId(),
        cedente == null ? null : cedente.getNome(),
        cedente == null ? null : cedente.getCorDeIdentificacao(),
        troca.getRecebedorId(),
        recebedor == null ? null : recebedor.getNome(),
        recebedor == null ? null : recebedor.getCorDeIdentificacao(),
        troca.getHoras(),
        troca.getKm(),
        troca.getValorPorHora(),
        troca.valorTotal(),
        troca.getRelatorioDeVoo(),
        troca.getObservacao(),
        troca.getSituacao(),
        troca.getConcluidaEm());
  }
}
