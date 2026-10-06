package br.com.aerodash.aether.aporte;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;

/**
 * O que a aplicação do saldo do fundo rendeu num crédito. Não tem proprietário: é rateado pela
 * participação de cada um.
 *
 * <p>O valor é o que o banco creditou. Saldo aplicado e taxa são o extrato, guardados para
 * conferência — nunca recalculam o valor, porque o banco arredonda do jeito dele.
 */
@Entity
@Table(name = "rendimento")
public class Rendimento {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "aeronave_id", nullable = false)
  private Long aeronaveId;

  @Column(name = "data", nullable = false)
  private LocalDate data;

  @Column(name = "aplicacao", nullable = false, length = 60)
  private String aplicacao;

  @Column(name = "saldo_aplicado", precision = 14, scale = 2)
  private BigDecimal saldoAplicado;

  @Column(name = "taxa", precision = 7, scale = 4)
  private BigDecimal taxa;

  @Column(name = "valor", nullable = false, precision = 14, scale = 2)
  private BigDecimal valor;

  @Column(name = "criado_em", nullable = false)
  private Instant criadoEm;

  @Column(name = "atualizado_em", nullable = false)
  private Instant atualizadoEm;

  /** Exigido pelo JPA. */
  protected Rendimento() {}

  public Rendimento(Long aeronaveId, DadosDoRendimento dados, Instant momento) {
    this.aeronaveId = aeronaveId;
    this.criadoEm = momento;
    atualizar(dados, momento);
  }

  public final void atualizar(DadosDoRendimento dados, Instant momento) {
    this.data = dados.data();
    this.aplicacao = dados.aplicacao().trim();
    this.saldoAplicado = dados.saldoAplicado();
    this.taxa = dados.taxa();
    this.valor = dados.valor();
    this.atualizadoEm = momento;
  }

  /** O rendimento entra na competência em que foi creditado. */
  public YearMonth getCompetencia() {
    return YearMonth.from(data);
  }

  public boolean estaNoFuturo(LocalDate hoje) {
    return data.isAfter(hoje);
  }

  public Long getId() {
    return id;
  }

  public Long getAeronaveId() {
    return aeronaveId;
  }

  public LocalDate getData() {
    return data;
  }

  public String getAplicacao() {
    return aplicacao;
  }

  public BigDecimal getSaldoAplicado() {
    return saldoAplicado;
  }

  public BigDecimal getTaxa() {
    return taxa;
  }

  public BigDecimal getValor() {
    return valor;
  }
}
