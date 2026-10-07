package br.com.aerodash.aether.troca;

import br.com.aerodash.aether.aeronave.Aeronave;
import br.com.aerodash.aether.aeronave.AeronaveRepository;
import br.com.aerodash.aether.aeronave.FiltroPorAeronave;
import br.com.aerodash.aether.comum.erro.RecursoNaoEncontradoException;
import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import br.com.aerodash.aether.proprietario.Proprietario;
import br.com.aerodash.aether.proprietario.ProprietarioRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
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

  /**
   * O "hoje" das datas civis da troca. O relógio da aplicação é UTC, e entre 21h e meia-noite em
   * Brasília ele já está no dia seguinte: uma troca de amanhã passaria por "não futura".
   */
  static final ZoneId FUSO_DO_NEGOCIO = ZoneId.of("America/Sao_Paulo");

  private static final DateTimeFormatter DATA = DateTimeFormatter.ofPattern("dd/MM/yyyy");
  private static final String CAMPO_AERONAVE = "aeronaveId";
  private static final String CAMPO_DATA = "data";
  private static final String CAMPO_CEDENTE = "cedenteId";
  private static final String CAMPO_RECEBEDOR = "recebedorId";

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
    contexto.decisao("trocas.filtroPorProprietario", proprietarioId != null);
    FiltroPorAeronave.exigirExistente("trocas", aeronaveId, aeronaves::existsById, contexto);
    exigirProprietarioDoFiltro(proprietarioId);
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

  /** Filtro por quem não existe é 404: senão a tela mostraria um saldo de 0 h para ninguém. */
  private void exigirProprietarioDoFiltro(Long proprietarioId) {
    boolean proprietarioExiste = proprietarioId == null || proprietarios.existsById(proprietarioId);
    contexto.decisao("trocas.proprietarioDoFiltroExiste", proprietarioExiste);
    if (!proprietarioExiste) {
      throw new RecursoNaoEncontradoException("Proprietário não encontrado.");
    }
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
          "A aeronave da troca não muda: registre uma nova na aeronave certa.", CAMPO_AERONAVE);
    }
    troca.atualizar(dadosDe(request), Instant.now(relogio));
    // Recusar depois de alterar é seguro: a exceção desfaz a transação antes do flush.
    validar(troca);
    return paraLinhas(List.of(troca)).get(0);
  }

  @Transactional
  public TrocaResponse concluir(Long id, ConclusaoDaTrocaRequest request) {
    TrocaDeKm troca = exigirTroca(id);
    boolean jaConcluida = troca.estaConcluida();
    contexto.decisao("troca.jaConcluida", jaConcluida);
    if (jaConcluida) {
      // Concluir de novo não muda a data da primeira devolução: para corrigi-la, reabre-se.
      return paraLinhas(List.of(troca)).get(0);
    }
    LocalDate hoje = hoje();
    boolean devolucaoAceitavel = troca.podeSerDevolvidaEm(request.concluidaEm(), hoje);
    contexto.decisao("troca.devolucaoAceitavel", devolucaoAceitavel);
    if (!devolucaoAceitavel) {
      throw new TrocaInvalidaException(
          "A devolução fica entre a data da troca (%s) e hoje (%s)."
              .formatted(DATA.format(troca.getData()), DATA.format(hoje)),
          "concluidaEm");
    }
    troca.concluir(request.concluidaEm(), Instant.now(relogio));
    return paraLinhas(List.of(troca)).get(0);
  }

  @Transactional
  public TrocaResponse reabrir(Long id) {
    TrocaDeKm troca = exigirTroca(id);
    troca.reabrir(Instant.now(relogio));
    return paraLinhas(List.of(troca)).get(0);
  }

  private LocalDate hoje() {
    return LocalDate.now(relogio.withZone(FUSO_DO_NEGOCIO));
  }

  private void validar(TrocaDeKm troca) {
    boolean diferentes = troca.ehEntreProprietariosDiferentes();
    contexto.decisao("troca.entreProprietariosDiferentes", diferentes);
    if (!diferentes) {
      throw new TrocaInvalidaException(
          "Quem cede e quem recebe precisam ser proprietários diferentes.", CAMPO_RECEBEDOR);
    }
    validarDatas(troca);
    exigirParticipante(troca.getAeronaveId(), troca.getCedenteId(), CAMPO_CEDENTE);
    exigirParticipante(troca.getAeronaveId(), troca.getRecebedorId(), CAMPO_RECEBEDOR);
  }

  private void validarDatas(TrocaDeKm troca) {
    LocalDate hoje = hoje();
    boolean dataAceitavel = troca.possuiDataAceitavel(hoje);
    contexto.decisao("troca.dataAceitavel", dataAceitavel);
    if (!dataAceitavel) {
      throw new TrocaInvalidaException(
          "A troca registra horas já voadas: use uma data entre 01/01/2000 e hoje (%s)."
              .formatted(DATA.format(hoje)),
          CAMPO_DATA);
    }
    boolean devolucaoCoerente = troca.possuiDevolucaoCoerente();
    contexto.decisao("troca.devolucaoCoerente", devolucaoCoerente);
    if (!devolucaoCoerente) {
      throw new TrocaInvalidaException(
          "A devolução foi registrada em %s: a troca não pode ser depois dela."
              .formatted(DATA.format(troca.getConcluidaEm())),
          CAMPO_DATA);
    }
  }

  /** O proprietário vem no corpo: inexistente é recusa do campo, não endereço que não existe. */
  private void exigirParticipante(Long aeronaveId, Long proprietarioId, String campo) {
    boolean existe = proprietarios.existsById(proprietarioId);
    contexto.decisao("troca.proprietarioExiste", existe);
    if (!existe) {
      throw new TrocaInvalidaException("Proprietário não encontrado.", campo);
    }
    boolean participa = participantes.participaOuParticipou(aeronaveId, proprietarioId);
    contexto.decisao("troca.proprietarioParticipa", participa);
    if (!participa) {
      throw new TrocaInvalidaException(
          "Só troca horas quem participa ou participou do contrato desta aeronave.", campo);
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

  /** A aeronave vem no corpo: inexistente é recusa do campo, não endereço que não existe. */
  private void exigirAeronave(Long aeronaveId) {
    contexto.registrar("aeronave.id", aeronaveId);
    boolean existe = aeronaves.existsById(aeronaveId);
    contexto.decisao("troca.aeronaveExiste", existe);
    if (!existe) {
      throw new TrocaInvalidaException("Aeronave não encontrada.", CAMPO_AERONAVE);
    }
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
