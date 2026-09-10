package br.com.aerodash.aether.aeronave;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
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
 * <p>Hoje a aeronave é só cadastro e conformidade. O que o domínio ainda pede — contadores de horas
 * e ciclos alimentados pelo diário de bordo, participações de proprietários, fundo — entra com as
 * features donas de cada um.
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

  public Instant getCriadoEm() {
    return criadoEm;
  }

  public Instant getAtualizadoEm() {
    return atualizadoEm;
  }
}
