package br.com.aerodash.aether.manutencao;

import static br.com.aerodash.aether.manutencao.Recusa.recusarSe;

import br.com.aerodash.aether.aeronave.Aeronave;
import br.com.aerodash.aether.aeronave.AeronaveRepository;
import br.com.aerodash.aether.comum.erro.RecursoNaoEncontradoException;
import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Objects;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** A manutenção de cada aeronave: os limites monitorados e os eventos, julgados no servidor. */
@Service
public class ManutencaoService {

  private static final DateTimeFormatter DATA = DateTimeFormatter.ofPattern("dd/MM/yyyy");
  private static final String CONCLUSAO = "concluidaEm";

  private final ManutencaoRepository manutencoes;
  private final ParametroDeControleRepository parametros;
  private final AeronaveRepository aeronaves;
  private final InvariantesDoParametro invariantes;
  private final Clock relogio;
  private final ContextoDaRequisicao contexto;

  public ManutencaoService(
      ManutencaoRepository manutencoes,
      ParametroDeControleRepository parametros,
      AeronaveRepository aeronaves,
      InvariantesDoParametro invariantes,
      Clock relogio,
      ContextoDaRequisicao contexto) {
    this.manutencoes = manutencoes;
    this.parametros = parametros;
    this.aeronaves = aeronaves;
    this.invariantes = invariantes;
    this.relogio = relogio;
    this.contexto = contexto;
  }

  @Transactional(readOnly = true)
  public PainelDeManutencaoResponse painel(Long aeronaveId) {
    Aeronave aeronave = exigirAeronave(aeronaveId);
    LocalDate hoje = LocalDate.now(relogio);

    List<ParametroResponse> julgados =
        parametros.findByAeronaveIdOrderByNomeAsc(aeronaveId).stream()
            .map(parametro -> julgar(parametro, aeronave, hoje))
            .toList();

    contexto.registrar("manutencao.parametros", julgados.size());
    contexto.registrar(
        "manutencao.proximosDoLimite",
        julgados.stream()
            .filter(parametro -> parametro.situacao() != SituacaoDoParametro.REGULAR)
            .count());
    return new PainelDeManutencaoResponse(
        aeronave.getContadores().horasDeCelula(),
        aeronave.getContadores().ciclos(),
        julgados,
        paraResponses(
            manutencoes.findByAeronaveIdAndStatusOrderByDataAsc(
                aeronaveId, StatusDaManutencao.PROGRAMADA)),
        paraResponses(
            manutencoes.findByAeronaveIdAndStatusOrderByConcluidaEmDescDataDesc(
                aeronaveId, StatusDaManutencao.CONCLUIDA)));
  }

  @Transactional
  public ManutencaoResponse agendar(ManutencaoRequest request) {
    exigirAeronave(request.aeronaveId());
    Manutencao manutencao =
        new Manutencao(request.aeronaveId(), dadosDe(request), Instant.now(relogio));
    exigirDataProgramavel(manutencao);
    manutencao = manutencoes.save(manutencao);
    contexto.registrar("manutencao.id", manutencao.getId());
    return paraResponse(manutencao);
  }

  @Transactional
  public ManutencaoResponse atualizar(Long id, ManutencaoRequest request) {
    Manutencao manutencao = exigirManutencao(id);
    recusarSe(
        contexto,
        "manutencao.jaConcluida",
        !manutencao.podeSerCorrigida(),
        () ->
            new ManutencaoConcluidaException(
                "A manutenção já está no histórico: reabra-a para corrigir."));
    recusarSe(
        contexto,
        "manutencao.trocaDeAeronave",
        !Objects.equals(request.aeronaveId(), manutencao.getAeronaveId()),
        () ->
            new ManutencaoInvalidaException(
                "A aeronave da manutenção não muda: exclua e reagende na aeronave certa."));
    boolean dataMudou = !Objects.equals(request.data(), manutencao.getData());
    manutencao.atualizar(dadosDe(request), Instant.now(relogio));
    // A janela vale para a data nova: corrigir a descrição de uma antiga não exige mudar a data.
    contexto.decisao("manutencao.dataMudou", dataMudou);
    if (dataMudou) {
      exigirDataProgramavel(manutencao);
    }
    return paraResponse(manutencao);
  }

  @Transactional
  public ManutencaoResponse concluir(Long id, ConclusaoRequest request) {
    Manutencao manutencao = exigirManutencao(id);
    LocalDate dia = request.concluidaEm();
    recusarSe(
        contexto,
        "manutencao.jaConcluida",
        manutencao.estaConcluida(),
        () ->
            new ManutencaoConcluidaException(
                "A manutenção já está concluída: reabra-a para mudar a conclusão."));
    recusarSe(
        contexto,
        "manutencao.conclusaoNoFuturo",
        dia.isAfter(LocalDate.now(relogio)),
        () -> new ManutencaoInvalidaException("A conclusão não pode estar no futuro.", CONCLUSAO));
    recusarSe(
        contexto,
        "manutencao.conclusaoAntesDaJanela",
        !manutencao.aceitaConclusaoEm(dia),
        () ->
            new ManutencaoInvalidaException(
                "Use uma data a partir de %s: a manutenção está programada para %s."
                    .formatted(
                        DATA.format(manutencao.primeiraDataDeConclusao()),
                        DATA.format(manutencao.getData())),
                CONCLUSAO));
    manutencao.concluir(dia, Instant.now(relogio));
    return paraResponse(manutencao);
  }

  @Transactional
  public ManutencaoResponse reabrir(Long id) {
    Manutencao manutencao = exigirManutencao(id);
    contexto.decisao("manutencao.jaConcluida", manutencao.estaConcluida());
    manutencao.reabrir(Instant.now(relogio));
    return paraResponse(manutencao);
  }

  @Transactional
  public void excluir(Long id) {
    Manutencao manutencao = exigirManutencao(id);
    manutencoes.delete(manutencao);
    contexto.registrar("manutencao.excluida", id);
  }

  @Transactional
  public ParametroResponse criarParametro(ParametroRequest request) {
    Aeronave aeronave = exigirAeronave(request.aeronaveId());
    LocalDate hoje = LocalDate.now(relogio);
    ParametroDeControle parametro =
        new ParametroDeControle(request.aeronaveId(), dadosDe(request), Instant.now(relogio));
    invariantes.exigir(parametro, hoje);
    parametro = parametros.save(parametro);
    contexto.registrar("parametro.id", parametro.getId());
    return julgar(parametro, aeronave, hoje);
  }

  @Transactional
  public ParametroResponse atualizarParametro(Long id, ParametroRequest request) {
    ParametroDeControle parametro = exigirParametro(id);
    recusarSe(
        contexto,
        "parametro.trocaDeAeronave",
        !Objects.equals(request.aeronaveId(), parametro.getAeronaveId()),
        () -> new ManutencaoInvalidaException("A aeronave do parâmetro não muda."));
    LocalDate hoje = LocalDate.now(relogio);
    parametro.atualizar(dadosDe(request), Instant.now(relogio));
    invariantes.exigir(parametro, hoje);
    Aeronave aeronave = exigirAeronave(parametro.getAeronaveId());
    return julgar(parametro, aeronave, hoje);
  }

  @Transactional
  public void excluirParametro(Long id) {
    ParametroDeControle parametro = exigirParametro(id);
    parametros.delete(parametro);
    contexto.registrar("parametro.excluido", id);
  }

  private void exigirDataProgramavel(Manutencao manutencao) {
    LocalDate hoje = LocalDate.now(relogio);
    recusarSe(
        contexto,
        "manutencao.dataForaDaJanela",
        !manutencao.possuiDataProgramavel(hoje),
        () ->
            new ManutencaoInvalidaException(
                "Use uma data entre %s e %s."
                    .formatted(
                        DATA.format(Manutencao.primeiraDataProgramavel(hoje)),
                        DATA.format(Manutencao.ultimaDataProgramavel(hoje))),
                "data"));
  }

  private ParametroResponse julgar(
      ParametroDeControle parametro, Aeronave aeronave, LocalDate hoje) {
    BigDecimal atual = parametro.atualEm(aeronave.getContadores());
    BigDecimal referencia = atual == null ? BigDecimal.ZERO : atual;
    return new ParametroResponse(
        parametro.getId(),
        parametro.getAeronaveId(),
        parametro.getNome(),
        parametro.getTipo(),
        parametro.getLimite(),
        parametro.getDataLimite(),
        parametro.getAviso(),
        atual,
        parametro.restante(referencia, hoje),
        parametro.situacao(referencia, hoje));
  }

  private List<ManutencaoResponse> paraResponses(List<Manutencao> eventos) {
    return eventos.stream().map(this::paraResponse).toList();
  }

  private ManutencaoResponse paraResponse(Manutencao manutencao) {
    return new ManutencaoResponse(
        manutencao.getId(),
        manutencao.getAeronaveId(),
        manutencao.getData(),
        manutencao.getHora(),
        manutencao.getResponsavel(),
        manutencao.getDescricao(),
        manutencao.getValor(),
        manutencao.getStatus(),
        manutencao.getConcluidaEm());
  }

  private DadosDaManutencao dadosDe(ManutencaoRequest request) {
    return new DadosDaManutencao(
        request.data(),
        request.hora(),
        request.responsavel(),
        request.descricao(),
        request.valor());
  }

  private DadosDoParametro dadosDe(ParametroRequest request) {
    return new DadosDoParametro(
        request.nome(), request.tipo(), request.limite(), request.dataLimite(), request.aviso());
  }

  private Aeronave exigirAeronave(Long aeronaveId) {
    contexto.registrar("aeronave.id", aeronaveId);
    return aeronaves
        .findById(aeronaveId)
        .orElseThrow(() -> new RecursoNaoEncontradoException("Aeronave não encontrada."));
  }

  private Manutencao exigirManutencao(Long id) {
    contexto.registrar("manutencao.id", id);
    return manutencoes
        .findById(id)
        .orElseThrow(() -> new RecursoNaoEncontradoException("Manutenção não encontrada."));
  }

  private ParametroDeControle exigirParametro(Long id) {
    contexto.registrar("parametro.id", id);
    return parametros
        .findById(id)
        .orElseThrow(() -> new RecursoNaoEncontradoException("Parâmetro não encontrado."));
  }
}
