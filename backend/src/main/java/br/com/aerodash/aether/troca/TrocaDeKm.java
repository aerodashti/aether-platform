package br.com.aerodash.aether.troca;

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
import java.util.Locale;
import java.util.Objects;

/**
 * Horas que um proprietário cedeu a outro na mesma aeronave. É controle entre eles, não lançamento:
 * o rateio do fechamento não muda — o custo continua com quem voou. Concluir registra a devolução;
 * reabrir existe para o engano.
 */
@Entity
@Table(name = "troca_de_km")
public class TrocaDeKm {

  /** Antes disso é ano digitado errado: a troca registra horas já voadas, e não há voo de 1900. */
  public static final LocalDate PRIMEIRA_DATA_ACEITA = LocalDate.of(2000, 1, 1);

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "aeronave_id", nullable = false)
  private Long aeronaveId;

  @Column(name = "data", nullable = false)
  private LocalDate data;

  @Column(name = "cedente_id", nullable = false)
  private Long cedenteId;

  @Column(name = "recebedor_id", nullable = false)
  private Long recebedorId;

  @Column(name = "horas", nullable = false, precision = 6, scale = 1)
  private BigDecimal horas;

  @Column(name = "km", precision = 10, scale = 1)
  private BigDecimal km;

  @Column(name = "valor_por_hora", precision = 12, scale = 2)
  private BigDecimal valorPorHora;

  @Column(name = "relatorio_de_voo", length = 20)
  private String relatorioDeVoo;

  @Column(name = "observacao", length = 300)
  private String observacao;

  @Enumerated(EnumType.STRING)
  @Column(name = "situacao", nullable = false, length = 10)
  private SituacaoDaTroca situacao;

  @Column(name = "concluida_em")
  private LocalDate concluidaEm;

  @Column(name = "criado_em", nullable = false)
  private Instant criadoEm;

  @Column(name = "atualizado_em", nullable = false)
  private Instant atualizadoEm;

  /** Exigido pelo JPA. */
  protected TrocaDeKm() {}

  public TrocaDeKm(Long aeronaveId, DadosDaTroca dados, Instant momento) {
    this.aeronaveId = aeronaveId;
    this.situacao = SituacaoDaTroca.PENDENTE;
    this.criadoEm = momento;
    atualizar(dados, momento);
  }

  public final void atualizar(DadosDaTroca dados, Instant momento) {
    this.data = dados.data();
    this.cedenteId = dados.cedenteId();
    this.recebedorId = dados.recebedorId();
    this.horas = dados.horas();
    this.km = dados.km();
    this.valorPorHora = dados.valorPorHora();
    this.relatorioDeVoo = normalizarRelatorioDeVoo(dados.relatorioDeVoo());
    this.observacao = semBrancos(dados.observacao());
    this.atualizadoEm = momento;
  }

  private static String semBrancos(String texto) {
    return texto == null || texto.isBlank() ? null : texto.trim();
  }

  /** Como no custo e no trecho: "rv-2026-041" e "RV-2026-041" são o mesmo voo. */
  private static String normalizarRelatorioDeVoo(String relatorioDeVoo) {
    String texto = semBrancos(relatorioDeVoo);
    return texto == null ? null : texto.toUpperCase(Locale.ROOT);
  }

  /** Registra a devolução. Concluir duas vezes não muda a data da primeira. */
  public void concluir(LocalDate devolucao, Instant momento) {
    if (estaConcluida()) {
      return;
    }
    this.situacao = SituacaoDaTroca.CONCLUIDA;
    this.concluidaEm = devolucao;
    this.atualizadoEm = momento;
  }

  public void reabrir(Instant momento) {
    this.situacao = SituacaoDaTroca.PENDENTE;
    this.concluidaEm = null;
    this.atualizadoEm = momento;
  }

  public boolean estaConcluida() {
    return situacao == SituacaoDaTroca.CONCLUIDA;
  }

  /** Ceder a si mesmo não é troca. */
  public boolean ehEntreProprietariosDiferentes() {
    return !Objects.equals(cedenteId, recebedorId);
  }

  /** A troca registra horas já voadas: de 2000 em diante e nunca depois de hoje. */
  public boolean possuiDataAceitavel(LocalDate hoje) {
    return !data.isBefore(PRIMEIRA_DATA_ACEITA) && !data.isAfter(hoje);
  }

  /** Concluída, a devolução não vem antes da própria troca — vale também para a correção. */
  public boolean possuiDevolucaoCoerente() {
    return !estaConcluida() || !data.isAfter(concluidaEm);
  }

  /** A devolução acontece entre a data da troca e hoje. */
  public boolean podeSerDevolvidaEm(LocalDate devolucao, LocalDate hoje) {
    return !devolucao.isBefore(data) && !devolucao.isAfter(hoje);
  }

  /** O valor da troca em dinheiro, se houver R$/hora combinado. */
  public BigDecimal valorTotal() {
    return valorPorHora == null
        ? null
        : valorPorHora.multiply(horas).setScale(2, RoundingMode.HALF_UP);
  }

  /**
   * Quanto este proprietário tem a devolver nesta troca: + se recebeu, − se cedeu, 0 se não é dele.
   */
  public BigDecimal horasADevolverPor(Long proprietarioId) {
    if (estaConcluida()) {
      return BigDecimal.ZERO;
    }
    if (recebedorId.equals(proprietarioId)) {
      return horas;
    }
    return cedenteId.equals(proprietarioId) ? horas.negate() : BigDecimal.ZERO;
  }

  public boolean envolve(Long proprietarioId) {
    return cedenteId.equals(proprietarioId) || recebedorId.equals(proprietarioId);
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

  public Long getCedenteId() {
    return cedenteId;
  }

  public Long getRecebedorId() {
    return recebedorId;
  }

  public BigDecimal getHoras() {
    return horas;
  }

  public BigDecimal getKm() {
    return km;
  }

  public BigDecimal getValorPorHora() {
    return valorPorHora;
  }

  public String getRelatorioDeVoo() {
    return relatorioDeVoo;
  }

  public String getObservacao() {
    return observacao;
  }

  public SituacaoDaTroca getSituacao() {
    return situacao;
  }

  public LocalDate getConcluidaEm() {
    return concluidaEm;
  }
}
