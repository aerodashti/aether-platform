package br.com.aerodash.aether.manutencao;

import br.com.aerodash.aether.aeronave.Aeronave;
import br.com.aerodash.aether.aeronave.AeronaveRepository;
import br.com.aerodash.aether.comum.erro.RecursoNaoEncontradoException;
import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** A manutenção de cada aeronave: os limites monitorados e os eventos, julgados no servidor. */
@Service
public class ManutencaoService {

  private final ManutencaoRepository manutencoes;
  private final ParametroDeControleRepository parametros;
  private final AeronaveRepository aeronaves;
  private final Clock relogio;
  private final ContextoDaRequisicao contexto;

  public ManutencaoService(
      ManutencaoRepository manutencoes,
      ParametroDeControleRepository parametros,
      AeronaveRepository aeronaves,
      Clock relogio,
      ContextoDaRequisicao contexto) {
    this.manutencoes = manutencoes;
    this.parametros = parametros;
    this.aeronaves = aeronaves;
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
        listarEventos(aeronaveId, StatusDaManutencao.PROGRAMADA),
        listarEventos(aeronaveId, StatusDaManutencao.CONCLUIDA));
  }

  @Transactional
  public ManutencaoResponse agendar(ManutencaoRequest request) {
    exigirAeronave(request.aeronaveId());
    Manutencao manutencao =
        new Manutencao(request.aeronaveId(), dadosDe(request), Instant.now(relogio));
    manutencao = manutencoes.save(manutencao);
    contexto.registrar("manutencao.id", manutencao.getId());
    return paraResponse(manutencao);
  }

  @Transactional
  public ManutencaoResponse atualizar(Long id, ManutencaoRequest request) {
    Manutencao manutencao = exigirManutencao(id);
    boolean trocaDeAeronave = !Objects.equals(request.aeronaveId(), manutencao.getAeronaveId());
    contexto.decisao("manutencao.trocaDeAeronave", trocaDeAeronave);
    if (trocaDeAeronave) {
      throw new ManutencaoInvalidaException(
          "A aeronave da manutenção não muda: exclua e reagende na aeronave certa.");
    }
    manutencao.atualizar(dadosDe(request), Instant.now(relogio));
    return paraResponse(manutencao);
  }

  @Transactional
  public ManutencaoResponse concluir(Long id) {
    Manutencao manutencao = exigirManutencao(id);
    contexto.decisao("manutencao.jaConcluida", manutencao.estaConcluida());
    manutencao.concluir(Instant.now(relogio));
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
    ParametroDeControle parametro =
        new ParametroDeControle(request.aeronaveId(), dadosDe(request), Instant.now(relogio));
    validar(parametro);
    parametro = parametros.save(parametro);
    contexto.registrar("parametro.id", parametro.getId());
    return julgar(parametro, aeronave, LocalDate.now(relogio));
  }

  @Transactional
  public ParametroResponse atualizarParametro(Long id, ParametroRequest request) {
    ParametroDeControle parametro = exigirParametro(id);
    boolean trocaDeAeronave = !Objects.equals(request.aeronaveId(), parametro.getAeronaveId());
    contexto.decisao("parametro.trocaDeAeronave", trocaDeAeronave);
    if (trocaDeAeronave) {
      throw new ManutencaoInvalidaException("A aeronave do parâmetro não muda.");
    }
    parametro.atualizar(dadosDe(request), Instant.now(relogio));
    validar(parametro);
    Aeronave aeronave = exigirAeronave(parametro.getAeronaveId());
    return julgar(parametro, aeronave, LocalDate.now(relogio));
  }

  @Transactional
  public void excluirParametro(Long id) {
    ParametroDeControle parametro = exigirParametro(id);
    parametros.delete(parametro);
    contexto.registrar("parametro.excluido", id);
  }

  private void validar(ParametroDeControle parametro) {
    contexto.decisao("parametro.limiteCoerente", parametro.possuiLimiteCoerente());
    if (!parametro.possuiLimiteCoerente()) {
      throw new ManutencaoInvalidaException(
          "Parâmetro de data exige a data limite; de horas ou ciclos exige o limite numérico.");
    }
  }

  private ParametroResponse julgar(
      ParametroDeControle parametro, Aeronave aeronave, LocalDate hoje) {
    BigDecimal atual =
        switch (parametro.getTipo()) {
          case HORAS -> aeronave.getContadores().horasDeCelula();
          case CICLOS -> BigDecimal.valueOf(aeronave.getContadores().ciclos());
          case DATA -> null;
        };
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

  private List<ManutencaoResponse> listarEventos(Long aeronaveId, StatusDaManutencao status) {
    List<Manutencao> eventos =
        status == StatusDaManutencao.PROGRAMADA
            ? manutencoes.findByAeronaveIdAndStatusOrderByDataAsc(aeronaveId, status)
            : manutencoes.findByAeronaveIdAndStatusOrderByDataDesc(aeronaveId, status);
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
        manutencao.getStatus());
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
