package br.com.aerodash.aether.aeronave;

import br.com.aerodash.aether.comum.erro.RecursoNaoEncontradoException;
import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** A frota: quem está sob gestão e em que situação regulatória cada uma está. */
@Service
public class AeronaveService {

  private final AeronaveRepository aeronaves;
  private final AeronaveMapper mapper;
  private final PoliticaDeVencimento politica;
  private final Clock relogio;
  private final ContextoDaRequisicao contexto;

  public AeronaveService(
      AeronaveRepository aeronaves,
      AeronaveMapper mapper,
      PoliticaDeVencimento politica,
      Clock relogio,
      ContextoDaRequisicao contexto) {
    this.aeronaves = aeronaves;
    this.mapper = mapper;
    this.politica = politica;
    this.relogio = relogio;
    this.contexto = contexto;
  }

  @Transactional(readOnly = true)
  public List<AeronaveResponse> listar() {
    LocalDate hoje = LocalDate.now(relogio);
    List<AeronaveResponse> frota =
        aeronaves.findAllByOrderByMatriculaAsc().stream()
            .map(aeronave -> mapper.paraLinhaDaFrota(aeronave, hoje, politica.diasDeAviso()))
            .toList();

    contexto.registrar("frota.aeronaves", frota.size());
    contexto.registrar(
        "frota.impedidas", frota.stream().filter(linha -> !linha.podeVoar()).count());
    return frota;
  }

  @Transactional(readOnly = true)
  public DetalheDaAeronaveResponse buscar(Long id) {
    return paraDetalhe(carregar(id));
  }

  @Transactional
  public DetalheDaAeronaveResponse atualizarFichaTecnica(Long id, FichaTecnicaRequest request) {
    Aeronave aeronave = carregar(id);
    aeronave.atualizarFichaTecnica(
        new Aeronave.FichaTecnica(
            request.fabricante(),
            request.modelo(),
            request.numeroDeSerie(),
            request.base(),
            request.hangar(),
            request.apoliceDoSeguro(),
            request.pesoMaxDecolagemKg(),
            request.pesoMaxPousoKg()),
        Instant.now(relogio));
    return paraDetalhe(aeronave);
  }

  @Transactional
  public DetalheDaAeronaveResponse criar(CriarAeronaveRequest request) {
    String matricula = Aeronave.normalizarMatricula(request.matricula());
    boolean duplicada = aeronaves.findByMatricula(matricula).isPresent();
    contexto.decisao("aeronave.matriculaDuplicada", duplicada);
    if (duplicada) {
      throw new MatriculaJaCadastradaException();
    }

    Instant agora = Instant.now(relogio);
    Aeronave aeronave =
        new Aeronave(
            matricula,
            request.modelo(),
            request.base(),
            request.vencimentoCva(),
            request.vencimentoReta(),
            agora);
    aeronave.atualizarFichaTecnica(
        new Aeronave.FichaTecnica(
            request.fabricante(),
            request.modelo(),
            request.numeroDeSerie(),
            request.base(),
            request.hangar(),
            request.apoliceDoSeguro(),
            request.pesoMaxDecolagemKg(),
            request.pesoMaxPousoKg()),
        agora);
    aeronave.corrigirContadores(montarContadores(request.contadores()), agora);
    aeronave.atualizarConfiguracaoFinanceira(
        montarConfiguracao(request.configuracaoFinanceira()), agora);

    aeronave = aeronaves.save(aeronave);
    contexto.registrar("aeronave.id", aeronave.getId());
    return paraDetalhe(aeronave);
  }

  @Transactional
  public DetalheDaAeronaveResponse corrigirContadores(Long id, ContadoresRequest request) {
    Aeronave aeronave = carregar(id);
    aeronave.corrigirContadores(montarContadores(request), Instant.now(relogio));
    return paraDetalhe(aeronave);
  }

  @Transactional
  public DetalheDaAeronaveResponse atualizarConfiguracaoFinanceira(
      Long id, ConfiguracaoFinanceiraRequest request) {
    Aeronave aeronave = carregar(id);
    aeronave.atualizarConfiguracaoFinanceira(montarConfiguracao(request), Instant.now(relogio));
    return paraDetalhe(aeronave);
  }

  /** Monta e valida: o Bean Validation barrou campo a campo; a regra composta é da entidade. */
  private ContadoresDaAeronave montarContadores(ContadoresRequest request) {
    ContadoresDaAeronave novos =
        new ContadoresDaAeronave(
            request.horasDeCelula(),
            request.ciclos(),
            request.kmVoados(),
            request.horasMotor1(),
            request.horasMotor2(),
            request.horasMotor3(),
            request.horasApu());
    contexto.decisao("aeronave.contadoresNegativos", novos.possuiValoresNegativos());
    if (novos.possuiValoresNegativos()) {
      throw new ConfiguracaoFinanceiraInvalidaException("Contadores não podem ser negativos.");
    }
    return novos;
  }

  private ConfiguracaoFinanceira montarConfiguracao(ConfiguracaoFinanceiraRequest request) {
    ConfiguracaoFinanceira nova =
        new ConfiguracaoFinanceira(
            request.baseDoRateio(),
            request.modeloDeAporte(),
            request.periodicidadeDoAporteMeses(),
            request.valorDoAporte(),
            request.diaDeFechamento());
    contexto.decisao("aeronave.periodicidadeValida", nova.possuiPeriodicidadeValida());
    if (!nova.possuiPeriodicidadeValida()) {
      throw new ConfiguracaoFinanceiraInvalidaException(
          "A periodicidade do aporte precisa ser 1, 2, 3, 4, 6 ou 12 meses.");
    }
    return nova;
  }

  private Aeronave carregar(Long id) {
    contexto.registrar("aeronave.id", id);
    return aeronaves
        .findById(id)
        .orElseThrow(() -> new RecursoNaoEncontradoException("Aeronave não encontrada."));
  }

  private DetalheDaAeronaveResponse paraDetalhe(Aeronave aeronave) {
    return mapper.paraDetalhe(aeronave, LocalDate.now(relogio), politica.diasDeAviso());
  }
}
