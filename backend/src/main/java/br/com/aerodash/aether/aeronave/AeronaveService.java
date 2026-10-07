package br.com.aerodash.aether.aeronave;

import br.com.aerodash.aether.comum.erro.RecursoNaoEncontradoException;
import br.com.aerodash.aether.comum.observabilidade.ContextoDaRequisicao;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.OptionalInt;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** A frota: quem está sob gestão e em que situação regulatória cada uma está. */
@Service
public class AeronaveService {

  /** A UNIQUE da V4: é por ela que se reconhece a corrida de dois cadastros da mesma matrícula. */
  private static final String MATRICULA_UNICA = "aeronave_matricula_unica";

  /** O caminho dos campos aninhados no JSON do cadastro, para a recusa cair no campo certo. */
  private static final String CONTADORES = "contadores.";

  private static final String CONFIGURACAO_FINANCEIRA = "configuracaoFinanceira.";

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
        validarPesos(
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
    validarVencimentos(aeronave, LocalDate.now(relogio));
    aeronave.atualizarFichaTecnica(validarPesos(fichaDoCadastro(request)), agora);
    aeronave.corrigirContadores(validarMotores(montarContadores(request.contadores())), agora);
    aeronave.atualizarConfiguracaoFinanceira(
        montarConfiguracao(request.configuracaoFinanceira(), CONFIGURACAO_FINANCEIRA), agora);

    aeronave = salvarNova(aeronave);
    contexto.registrar("aeronave.id", aeronave.getId());
    return paraDetalhe(aeronave);
  }

  private static FichaTecnica fichaDoCadastro(CriarAeronaveRequest request) {
    return new FichaTecnica(
        request.fabricante(),
        request.modelo(),
        request.numeroDeSerie(),
        request.base(),
        request.hangar(),
        request.apoliceDoSeguro(),
        request.pesoMaxDecolagemKg(),
        request.pesoMaxPousoKg());
  }

  /**
   * A busca por matrícula acima não fecha a corrida de dois cadastros simultâneos: quem chega
   * depois bate na UNIQUE do banco, e a resposta precisa ser a mesma 409 no campo da matrícula.
   */
  private Aeronave salvarNova(Aeronave aeronave) {
    try {
      return aeronaves.saveAndFlush(aeronave);
    } catch (DataIntegrityViolationException excecao) {
      boolean matriculaDuplicada = violouMatriculaUnica(excecao);
      contexto.decisao("aeronave.matriculaDuplicadaNoBanco", matriculaDuplicada);
      if (matriculaDuplicada) {
        throw new MatriculaJaCadastradaException();
      }
      throw excecao;
    }
  }

  private static boolean violouMatriculaUnica(DataIntegrityViolationException excecao) {
    for (Throwable causa = excecao; causa != null; causa = causa.getCause()) {
      if (causa instanceof ConstraintViolationException violacao) {
        return MATRICULA_UNICA.equalsIgnoreCase(violacao.getConstraintName());
      }
    }
    return false;
  }

  private void validarVencimentos(Aeronave aeronave, LocalDate hoje) {
    Optional<DocumentoDaAeronave> implausivel = aeronave.documentoComVencimentoImplausivel(hoje);
    contexto.decisao(
        "aeronave.vencimentoImplausivel", implausivel.map(Enum::name).orElse("nenhum"));
    if (implausivel.isPresent()) {
      throw switch (implausivel.get()) {
        case CVA ->
            new AeronaveInvalidaException(
                "O vencimento do CVA vai de 01/01/2000 até 13 meses a partir de hoje: a validade"
                    + " é de 12 meses.",
                "vencimentoCva");
        case RETA ->
            new AeronaveInvalidaException(
                "A vigência do seguro vai de 01/01/2000 até 5 anos a partir de hoje.",
                "vencimentoReta");
      };
    }
  }

  private FichaTecnica validarPesos(FichaTecnica ficha) {
    contexto.decisao("aeronave.pesosCoerentes", ficha.possuiPesosCoerentes());
    if (!ficha.possuiPesosCoerentes()) {
      throw new AeronaveInvalidaException(
          "O peso máximo de pouso não pode passar do de decolagem.", "pesoMaxPousoKg");
    }
    return ficha;
  }

  /** Só no cadastro: é nele que a pessoa escolhe quantos motores a aeronave tem. */
  private ContadoresDaAeronave validarMotores(ContadoresDaAeronave contadores) {
    OptionalInt motorSemHoras = contadores.motorSemHoras();
    contexto.decisao("aeronave.motoresEmSequencia", motorSemHoras.isEmpty());
    if (motorSemHoras.isPresent()) {
      int motor = motorSemHoras.getAsInt();
      throw new AeronaveInvalidaException(
          "Informe as horas do motor " + motor + " (0 se for novo).",
          CONTADORES + "horasMotor" + motor);
    }
    return contadores;
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
    aeronave.atualizarConfiguracaoFinanceira(montarConfiguracao(request, ""), Instant.now(relogio));
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

  /** {@code prefixo} é o caminho da configuração no JSON: aninhada no cadastro, raiz na edição. */
  private ConfiguracaoFinanceira montarConfiguracao(
      ConfiguracaoFinanceiraRequest request, String prefixo) {
    ConfiguracaoFinanceira nova =
        new ConfiguracaoFinanceira(
            request.baseDoRateio(),
            request.modeloDeAporte(),
            request.periodicidadeDoAporteMeses(),
            request.valorDoAporte(),
            request.diaDeFechamento(),
            request.saldoDeAbertura());
    contexto.decisao("aeronave.periodicidadeValida", nova.possuiPeriodicidadeValida());
    if (!nova.possuiPeriodicidadeValida()) {
      throw new ConfiguracaoFinanceiraInvalidaException(
          "A periodicidade do aporte precisa ser 1, 2, 3, 4, 6 ou 12 meses.",
          prefixo + "periodicidadeDoAporteMeses");
    }
    contexto.decisao("aeronave.valorDoAporteCoerente", nova.possuiValorDoAporteCoerente());
    if (!nova.possuiValorDoAporteCoerente()) {
      throw new ConfiguracaoFinanceiraInvalidaException(
          "No aporte fixo, informe o valor de cada aporte, maior que zero.",
          prefixo + "valorDoAporte");
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
    LocalDate hoje = LocalDate.now(relogio);
    int diasDeAviso = politica.diasDeAviso();
    return mapper.paraDetalhe(
        aeronave, hoje, diasDeAviso, pendencias.de(aeronave, hoje, diasDeAviso));
  }
}
