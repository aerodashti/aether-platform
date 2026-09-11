package br.com.aerodash.aether.custo;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;

/**
 * Um lançamento de despesa. O valor mora em BRL: lançamento em moeda estrangeira grava o valor
 * original e o câmbio do ato, e o BRL é derivado uma vez — auditável para sempre, sem depender de
 * cotação futura.
 */
@Entity
@Table(name = "custo")
public class Custo {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "aeronave_id", nullable = false)
  private Long aeronaveId;

  @Enumerated(EnumType.STRING)
  @Column(name = "tipo", nullable = false, length = 10)
  private TipoDeCusto tipo;

  @Enumerated(EnumType.STRING)
  @Column(name = "categoria", nullable = false, length = 30)
  private CategoriaDeCusto categoria;

  @Column(name = "data", nullable = false)
  private LocalDate data;

  @Column(name = "descricao", nullable = false, length = 200)
  private String descricao;

  @Column(name = "relatorio_de_voo", length = 20)
  private String relatorioDeVoo;

  /** Nulo = rateado entre todos os proprietários, pela regra da aeronave. */
  @Column(name = "proprietario_id")
  private Long proprietarioId;

  @Column(name = "nota_fiscal", length = 40)
  private String notaFiscal;

  @Enumerated(EnumType.STRING)
  @Column(name = "moeda", nullable = false, length = 3)
  private MoedaDoCusto moeda;

  @Column(name = "valor_original", precision = 14, scale = 2)
  private BigDecimal valorOriginal;

  @Column(name = "cambio", precision = 10, scale = 4)
  private BigDecimal cambio;

  @Column(name = "valor", nullable = false, precision = 14, scale = 2)
  private BigDecimal valor;

  @Column(name = "criado_em", nullable = false)
  private Instant criadoEm;

  @Column(name = "atualizado_em", nullable = false)
  private Instant atualizadoEm;

  /** Exigido pelo JPA. */
  protected Custo() {}

  public Custo(Long aeronaveId, DadosDoCusto dados, Instant momento) {
    this.aeronaveId = aeronaveId;
    this.criadoEm = momento;
    preencher(dados, momento);
  }

  public void atualizar(DadosDoCusto dados, Instant momento) {
    preencher(dados, momento);
  }

  private void preencher(DadosDoCusto dados, Instant momento) {
    this.tipo = dados.categoria().getTipo();
    this.categoria = dados.categoria();
    this.data = dados.data();
    this.descricao = dados.descricao().trim();
    this.relatorioDeVoo =
        dados.relatorioDeVoo() == null || dados.relatorioDeVoo().isBlank()
            ? null
            : dados.relatorioDeVoo().trim();
    this.proprietarioId = dados.proprietarioId();
    this.notaFiscal =
        dados.notaFiscal() == null || dados.notaFiscal().isBlank()
            ? null
            : dados.notaFiscal().trim();
    this.moeda = dados.moeda();
    if (dados.moeda() == MoedaDoCusto.BRL) {
      this.valorOriginal = null;
      this.cambio = null;
      this.valor = dados.valor();
    } else {
      this.valorOriginal = dados.valor();
      this.cambio = dados.cambio();
      this.valor = converterParaBrl(dados.valor(), dados.cambio());
    }
    this.atualizadoEm = momento;
  }

  /** A conversão acontece uma vez, no ato, com duas casas: é o que a nota vai mostrar. */
  public static BigDecimal converterParaBrl(BigDecimal valorOriginal, BigDecimal cambio) {
    return valorOriginal.multiply(cambio).setScale(2, RoundingMode.HALF_UP);
  }

  public boolean ehRateado() {
    return proprietarioId == null;
  }

  public boolean possuiCambioCoerente() {
    if (moeda == MoedaDoCusto.BRL) {
      return valorOriginal == null && cambio == null;
    }
    return valorOriginal != null
        && valorOriginal.signum() > 0
        && cambio != null
        && cambio.signum() > 0;
  }

  public Long getId() {
    return id;
  }

  public Long getAeronaveId() {
    return aeronaveId;
  }

  public TipoDeCusto getTipo() {
    return tipo;
  }

  public CategoriaDeCusto getCategoria() {
    return categoria;
  }

  public LocalDate getData() {
    return data;
  }

  public String getDescricao() {
    return descricao;
  }

  public String getRelatorioDeVoo() {
    return relatorioDeVoo;
  }

  public Long getProprietarioId() {
    return proprietarioId;
  }

  public String getNotaFiscal() {
    return notaFiscal;
  }

  public MoedaDoCusto getMoeda() {
    return moeda;
  }

  public BigDecimal getValorOriginal() {
    return valorOriginal;
  }

  public BigDecimal getCambio() {
    return cambio;
  }

  public BigDecimal getValor() {
    return valor;
  }

  public Instant getCriadoEm() {
    return criadoEm;
  }

  public Instant getAtualizadoEm() {
    return atualizadoEm;
  }
}
