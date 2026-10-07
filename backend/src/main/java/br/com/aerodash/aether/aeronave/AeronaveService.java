package br.com.aerodash.aether.aeronave;

import br.com.aerodash.aether.comum.erro.RecursoNaoEncontradoException;
import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** A frota: quem está sob gestão e em que situação regulatória cada uma está. */
@Service
public class AeronaveService {

  private final AeronaveRepository aeronaves;
  private final AeronaveMapper mapper;
  private final PoliticaDeVencimento politica;
  private final PendenciasDaFrota pendencias;
  private final Clock relogio;
  private final ContextoDaRequisicao contexto;

  public AeronaveService(
      AeronaveRepository aeronaves,
      AeronaveMapper mapper,
      PoliticaDeVencimento politica,
      PendenciasDaFrota pendencias,
      Clock relogio,
      ContextoDaRequisicao contexto) {
    this.aeronaves = aeronaves;
    this.mapper = mapper;
    this.politica = politica;
    this.pendencias = pendencias;
    this.relogio = relogio;
    this.contexto = contexto;
  }

  @Transactional(readOnly = true)
  public List<AeronaveResponse> listar() {
    LocalDate hoje = LocalDate.now(relogio);
    int diasDeAviso = politica.diasDeAviso();
    List<Aeronave> todas = aeronaves.findAllByOrderByMatriculaAsc();
    Map<Long, List<PendenciaOperacional>> pendenciasDaFrota =
        pendencias.de(todas, hoje, diasDeAviso);
    List<AeronaveResponse> frota =
        todas.stream()
            .map(
                aeronave ->
                    mapper.paraLinhaDaFrota(
                        aeronave,
                        hoje,
                        diasDeAviso,
                        pendenciasDaFrota.getOrDefault(aeronave.getId(), List.of())))
            .toList();
    contexto.registrar(
        "frota.comPendencia",
        pendenciasDaFrota.values().stream().filter(l -> !l.isEmpty()).count());

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
        validarFicha(
            new FichaTecnica(
                request.fabricante(),
                request.modelo(),
                request.numeroDeSerie(),
                request.base(),
                request.hangar(),
                request.apoliceDoSeguro(),
                request.pesoMaxDecolagemKg(),
                request.pesoMaxPousoKg())),
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
        validarFicha(
            new FichaTecnica(
                request.fabricante(),
                request.modelo(),
                request.numeroDeSerie(),
                request.base(),
                request.hangar(),
                request.apoliceDoSeguro(),
                request.pesoMaxDecolagemKg(),
                request.pesoMaxPousoKg())),
        agora);
    aeronave.corrigirContadores(montarContadores(request.contadores()), agora);
    aeronave.atualizarConfiguracaoFinanceira(
        montarConfiguracao(request.configuracaoFinanceira(), "configuracaoFinanceira."), agora);

    aeronave = aeronaves.save(aeronave);
    contexto.registrar("aeronave.id", aeronave.getId());
    return paraDetalhe(aeronave);
  }

  /**
   * A correção substitui os totais que os voos somaram. Se a tela leu outros totais, um voo entrou
   * no meio: gravar por cima o apagaria dos contadores, e a recusa pede para reabrir a edição.
   */
  @Transactional
  public DetalheDaAeronaveResponse corrigirContadores(Long id, ContadoresRequest request) {
    Aeronave aeronave = carregar(id);
    boolean desatualizados =
        request.lidos() != null
            && !aeronave.getContadores().possuiOsMesmosTotaisDe(contadoresLidos(request.lidos()));
    contexto.decisao("aeronave.contadoresDesatualizados", desatualizados);
    if (desatualizados) {
      throw new ContadoresDesatualizadosException();
    }
    aeronave.corrigirContadores(montarContadores(request), Instant.now(relogio));
    return paraDetalhe(aeronave);
  }

  @Transactional
  public DetalheDaAeronaveResponse atualizarConfiguracaoFinanceira(
      Long id, ConfiguracaoFinanceiraRequest request) {
    Aeronave aeronave = carregar(id);
    aeronave.atualizarConfiguracaoFinanceira(montarConfiguracao(request, ""), Instant.now(relogio));
    return paraDetalhe(aeronave);
  }

  private FichaTecnica validarFicha(FichaTecnica ficha) {
    boolean pesosCoerentes = ficha.possuiPesosCoerentes();
    contexto.decisao("aeronave.pesosCoerentes", pesosCoerentes);
    if (!pesosCoerentes) {
      throw new FichaTecnicaInvalidaException(
          "O peso máximo de pouso não pode passar do peso máximo de decolagem.", "pesoMaxPousoKg");
    }
    return ficha;
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

  /**
   * Monta e valida a configuração. O prefixo é o caminho dela no JSON — vazio na rota própria,
   * {@code configuracaoFinanceira.} no cadastro — para a recusa cair no campo certo da tela.
   */
  private ConfiguracaoFinanceira montarConfiguracao(
      ConfiguracaoFinanceiraRequest request, String prefixo) {
    ConfiguracaoFinanceira nova =
        new ConfiguracaoFinanceira(
                request.baseDoRateio(),
                request.modeloDeAporte(),
                request.periodicidadeDoAporteMeses(),
                request.valorDoAporte(),
                request.diaDeFechamento(),
                request.saldoDeAbertura())
            .semValorForaDoAporteFixo();
    contexto.decisao("aeronave.periodicidadeValida", nova.possuiPeriodicidadeValida());
    if (!nova.possuiPeriodicidadeValida()) {
      throw new ConfiguracaoFinanceiraInvalidaException(
          "A periodicidade do aporte precisa ser 1, 2, 3, 4, 6 ou 12 meses.",
          prefixo + "periodicidadeDoAporteMeses");
    }
    contexto.decisao("aeronave.valorDoAporteCoerente", nova.possuiValorDoAporteCoerente());
    if (!nova.possuiValorDoAporteCoerente()) {
      throw new ConfiguracaoFinanceiraInvalidaException(
          "Informe o valor de cada aporte: no aporte fixo, é ele que se cobra a cada período.",
          prefixo + "valorDoAporte");
    }
    return nova;
  }

  private static ContadoresDaAeronave contadoresLidos(DetalheDaAeronaveResponse.Contadores lidos) {
    return new ContadoresDaAeronave(
        lidos.horasDeCelula(),
        lidos.ciclos(),
        lidos.kmVoados(),
        lidos.horasMotor1(),
        lidos.horasMotor2(),
        lidos.horasMotor3(),
        lidos.horasApu());
  }

  private Aeronave carregar(Long id) {
    contexto.registrar("aeronave.id", id);
    return aeronaves
        .findById(id)
        .orElseThrow(() -> new RecursoNaoEncontradoException("Aeronave não encontrada."));
  }

  private DetalheDaAeronaveResponse paraDetalhe(Aeronave aeronave) {
    LocalDate hoje = LocalDate.now(relogio);
    int diasDeAviso = politica.diasDeAviso();
    return mapper.paraDetalhe(
        aeronave, hoje, diasDeAviso, pendencias.de(aeronave, hoje, diasDeAviso));
  }
}
