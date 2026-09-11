package br.com.aerodash.aether.aeronave;

import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Locale;

/**
 * Jato ou helicóptero sob gestão no Aether.
 *
 * <p>A camada regulatória mora aqui, não no service: se um {@code if} olha só para os vencimentos
 * deste objeto, ele pertence a este objeto. Veja {@code docs/arquitetura.md}.
 *
 * <p>Além do cadastro e da conformidade, a aeronave carrega a ficha técnica (contadores declarados,
 * corrigidos só por administrador até o diário de voos alimentá-los) e a configuração financeira do
 * rateio. As participações de proprietários moram em {@code participacao}, com o contrato vigente e
 * o histórico.
 */
@Entity
@Table(name = "aeronave")
public class Aeronave {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "matricula", nullable = false, unique = true, length = 10)
  private String matricula;

  @Column(name = "modelo", nullable = false, length = 120)
  private String modelo;

  @Column(name = "base", nullable = false, length = 4)
  private String base;

  @Column(name = "fabricante", length = 80)
  private String fabricante;

  @Column(name = "numero_de_serie", length = 40)
  private String numeroDeSerie;

  @Column(name = "hangar", length = 60)
  private String hangar;

  /** Número da apólice. A vigência é o {@code vencimentoReta}: RETA é o seguro. */
  @Column(name = "apolice_do_seguro", length = 40)
  private String apoliceDoSeguro;

  /** MTOW em kg, do certificado. Nulo é "não informado" — peso zero não existe. */
  @Column(name = "peso_max_decolagem_kg")
  private Integer pesoMaxDecolagemKg;

  @Column(name = "peso_max_pouso_kg")
  private Integer pesoMaxPousoKg;

  @Embedded private ContadoresDaAeronave contadores;

  @Embedded private ConfiguracaoFinanceira configuracaoFinanceira;

  @Column(name = "vencimento_cva", nullable = false)
  private LocalDate vencimentoCva;

  @Column(name = "vencimento_reta", nullable = false)
  private LocalDate vencimentoReta;

  @Column(name = "criado_em", nullable = false)
  private Instant criadoEm;

  @Column(name = "atualizado_em", nullable = false)
  private Instant atualizadoEm;

  /** Exigido pelo JPA. */
  protected Aeronave() {}

  public Aeronave(
      String matricula,
      String modelo,
      String base,
      LocalDate vencimentoCva,
      LocalDate vencimentoReta,
      Instant momento) {
    this.matricula = normalizarMatricula(matricula);
    this.modelo = modelo;
    this.base = normalizarBase(base);
    this.vencimentoCva = vencimentoCva;
    this.vencimentoReta = vencimentoReta;
    this.contadores = ContadoresDaAeronave.zerados();
    this.configuracaoFinanceira = ConfiguracaoFinanceira.padrao();
    this.criadoEm = momento;
    this.atualizadoEm = momento;
  }

  /** A matrícula é identidade pública: não depende de como foi digitada. */
  public static String normalizarMatricula(String matricula) {
    return matricula == null ? null : matricula.trim().toUpperCase(Locale.ROOT);
  }

  public static String normalizarBase(String base) {
    return base == null ? null : base.trim().toUpperCase(Locale.ROOT);
  }

  /**
   * O documento que vence primeiro. É ele que governa a situação: conformidade não é média, é o elo
   * mais fraco — de nada adianta a apólice estar em dia se o CVA venceu.
   */
  public LocalDate proximoVencimento() {
    return vencimentoCva.isBefore(vencimentoReta) ? vencimentoCva : vencimentoReta;
  }

  /** Qual documento vence primeiro, para a tela dizer o que está acontecendo, e não só quando. */
  public DocumentoDaAeronave documentoDoProximoVencimento() {
    return vencimentoCva.isBefore(vencimentoReta)
        ? DocumentoDaAeronave.CVA
        : DocumentoDaAeronave.RETA;
  }

  /** Negativo quando já venceu — "há três dias" e "em três dias" são o mesmo eixo. */
  public long diasAteOProximoVencimento(LocalDate hoje) {
    return ChronoUnit.DAYS.between(hoje, proximoVencimento());
  }

  public boolean possuiDocumentoVencido(LocalDate hoje) {
    return diasAteOProximoVencimento(hoje) < 0;
  }

  /**
   * Voar exige documento válido. É a pergunta que a tela de Documentos responde e a razão de a
   * situação existir.
   */
  public boolean podeVoar(LocalDate hoje) {
    return !possuiDocumentoVencido(hoje);
  }

  /**
   * A situação num instante, dada a janela de atenção vigente.
   *
   * <p>A janela vem de fora porque é política configurável, não norma: o DD-011 do design registra
   * que os limiares são semente ajustável por inquilino.
   */
  public SituacaoRegular situacaoRegular(LocalDate hoje, int diasDeAtencao) {
    long dias = diasAteOProximoVencimento(hoje);
    if (dias < 0) {
      return SituacaoRegular.VENCIDO;
    }
    return dias <= diasDeAtencao ? SituacaoRegular.ATENCAO : SituacaoRegular.REGULAR;
  }

  public void atualizarCadastro(String modelo, String base, Instant momento) {
    this.modelo = modelo;
    this.base = normalizarBase(base);
    this.atualizadoEm = momento;
  }

  public void atualizarVencimentos(LocalDate cva, LocalDate reta, Instant momento) {
    this.vencimentoCva = cva;
    this.vencimentoReta = reta;
    this.atualizadoEm = momento;
  }

  /** Os dados de identificação da ficha técnica. A matrícula fica de fora: é identidade. */
  public void atualizarFichaTecnica(FichaTecnica ficha, Instant momento) {
    this.fabricante = ficha.fabricante();
    this.modelo = ficha.modelo();
    this.numeroDeSerie = ficha.numeroDeSerie();
    this.base = normalizarBase(ficha.base());
    this.hangar = ficha.hangar();
    this.apoliceDoSeguro = ficha.apoliceDoSeguro();
    this.pesoMaxDecolagemKg = ficha.pesoMaxDecolagemKg();
    this.pesoMaxPousoKg = ficha.pesoMaxPousoKg();
    this.atualizadoEm = momento;
  }

  /** Os campos editáveis da ficha, juntos: eles só andam juntos. */
  public record FichaTecnica(
      String fabricante,
      String modelo,
      String numeroDeSerie,
      String base,
      String hangar,
      String apoliceDoSeguro,
      Integer pesoMaxDecolagemKg,
      Integer pesoMaxPousoKg) {}

  /** Correção manual dos totais — rota de administrador enquanto o diário de voos não existe. */
  public void corrigirContadores(ContadoresDaAeronave novosContadores, Instant momento) {
    this.contadores = novosContadores;
    this.atualizadoEm = momento;
  }

  /** O diário de voos alimenta os contadores por aqui: horas de célula, km e pousos. */
  public void acumularVoo(BigDecimal horas, BigDecimal km, int pousos, Instant momento) {
    this.contadores = contadores.acumular(horas, km, pousos);
    this.atualizadoEm = momento;
  }

  public void atualizarConfiguracaoFinanceira(ConfiguracaoFinanceira nova, Instant momento) {
    this.configuracaoFinanceira = nova;
    this.atualizadoEm = momento;
  }

  public Long getId() {
    return id;
  }

  public String getMatricula() {
    return matricula;
  }

  public String getModelo() {
    return modelo;
  }

  public String getBase() {
    return base;
  }

  public LocalDate getVencimentoCva() {
    return vencimentoCva;
  }

  public LocalDate getVencimentoReta() {
    return vencimentoReta;
  }

  public String getFabricante() {
    return fabricante;
  }

  public String getNumeroDeSerie() {
    return numeroDeSerie;
  }

  public String getHangar() {
    return hangar;
  }

  public String getApoliceDoSeguro() {
    return apoliceDoSeguro;
  }

  public Integer getPesoMaxDecolagemKg() {
    return pesoMaxDecolagemKg;
  }

  public Integer getPesoMaxPousoKg() {
    return pesoMaxPousoKg;
  }

  public ContadoresDaAeronave getContadores() {
    return contadores;
  }

  public ConfiguracaoFinanceira getConfiguracaoFinanceira() {
    return configuracaoFinanceira;
  }

  public Instant getCriadoEm() {
    return criadoEm;
  }

  public Instant getAtualizadoEm() {
    return atualizadoEm;
  }
}
