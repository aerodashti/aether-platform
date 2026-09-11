package br.com.aerodash.aether.manutencao;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/**
 * Um limite monitorado: "inspeção de célula a 3.600 h", "CVA até 09/05/2027". O que se grava é o
 * limite e a faixa de aviso; quanto falta é pergunta feita aos contadores da aeronave (ou ao
 * calendário), respondida a cada leitura — nunca gravada.
 */
@Entity
@Table(name = "parametro_de_controle")
public class ParametroDeControle {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "aeronave_id", nullable = false)
  private Long aeronaveId;

  @Column(name = "nome", nullable = false, length = 120)
  private String nome;

  @Enumerated(EnumType.STRING)
  @Column(name = "tipo", nullable = false, length = 10)
  private TipoDeParametro tipo;

  @Column(name = "limite", precision = 10, scale = 1)
  private BigDecimal limite;

  @Column(name = "data_limite")
  private LocalDate dataLimite;

  @Column(name = "aviso", nullable = false, precision = 10, scale = 1)
  private BigDecimal aviso;

  @Column(name = "criado_em", nullable = false)
  private Instant criadoEm;

  @Column(name = "atualizado_em", nullable = false)
  private Instant atualizadoEm;

  /** Exigido pelo JPA. */
  protected ParametroDeControle() {}

  public ParametroDeControle(Long aeronaveId, DadosDoParametro dados, Instant momento) {
    this.aeronaveId = aeronaveId;
    this.criadoEm = momento;
    preencher(dados, momento);
  }

  public void atualizar(DadosDoParametro dados, Instant momento) {
    preencher(dados, momento);
  }

  private void preencher(DadosDoParametro dados, Instant momento) {
    this.nome = dados.nome().trim();
    this.tipo = dados.tipo();
    this.limite = dados.tipo() == TipoDeParametro.DATA ? null : dados.limite();
    this.dataLimite = dados.tipo() == TipoDeParametro.DATA ? dados.dataLimite() : null;
    this.aviso = dados.aviso();
    this.atualizadoEm = momento;
  }

  public boolean possuiLimiteCoerente() {
    if (tipo == TipoDeParametro.DATA) {
      return dataLimite != null;
    }
    return limite != null && limite.signum() > 0;
  }

  /**
   * Quanto falta até o limite, na unidade do tipo: horas, ciclos ou dias. Negativo é estouro —
   * passado e futuro no mesmo eixo, como nos vencimentos.
   */
  public BigDecimal restante(BigDecimal atual, LocalDate hoje) {
    if (tipo == TipoDeParametro.DATA) {
      return BigDecimal.valueOf(ChronoUnit.DAYS.between(hoje, dataLimite));
    }
    return limite.subtract(atual);
  }

  public SituacaoDoParametro situacao(BigDecimal atual, LocalDate hoje) {
    BigDecimal falta = restante(atual, hoje);
    if (falta.signum() < 0) {
      return SituacaoDoParametro.ESTOURADO;
    }
    return falta.compareTo(aviso) <= 0 ? SituacaoDoParametro.ATENCAO : SituacaoDoParametro.REGULAR;
  }

  public Long getId() {
    return id;
  }

  public Long getAeronaveId() {
    return aeronaveId;
  }

  public String getNome() {
    return nome;
  }

  public TipoDeParametro getTipo() {
    return tipo;
  }

  public BigDecimal getLimite() {
    return limite;
  }

  public LocalDate getDataLimite() {
    return dataLimite;
  }

  public BigDecimal getAviso() {
    return aviso;
  }

  public Instant getCriadoEm() {
    return criadoEm;
  }

  public Instant getAtualizadoEm() {
    return atualizadoEm;
  }
}
