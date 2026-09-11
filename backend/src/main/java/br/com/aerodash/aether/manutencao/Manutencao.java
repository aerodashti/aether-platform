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
import java.time.LocalTime;

/**
 * Um evento de manutenção. Programada aparece no calendário de voos; concluída é registro
 * permanente — reabrir existe para o engano, não para reescrever a história.
 */
@Entity
@Table(name = "manutencao")
public class Manutencao {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "aeronave_id", nullable = false)
  private Long aeronaveId;

  @Column(name = "data", nullable = false)
  private LocalDate data;

  @Column(name = "hora")
  private LocalTime hora;

  @Column(name = "responsavel", length = 120)
  private String responsavel;

  @Column(name = "descricao", nullable = false, length = 200)
  private String descricao;

  @Column(name = "valor", precision = 14, scale = 2)
  private BigDecimal valor;

  @Enumerated(EnumType.STRING)
  @Column(name = "status", nullable = false, length = 12)
  private StatusDaManutencao status;

  @Column(name = "criado_em", nullable = false)
  private Instant criadoEm;

  @Column(name = "atualizado_em", nullable = false)
  private Instant atualizadoEm;

  /** Exigido pelo JPA. */
  protected Manutencao() {}

  public Manutencao(Long aeronaveId, DadosDaManutencao dados, Instant momento) {
    this.aeronaveId = aeronaveId;
    this.status = StatusDaManutencao.PROGRAMADA;
    this.criadoEm = momento;
    preencher(dados, momento);
  }

  public void atualizar(DadosDaManutencao dados, Instant momento) {
    preencher(dados, momento);
  }

  private void preencher(DadosDaManutencao dados, Instant momento) {
    this.data = dados.data();
    this.hora = dados.hora();
    this.responsavel =
        dados.responsavel() == null || dados.responsavel().isBlank()
            ? null
            : dados.responsavel().trim();
    this.descricao = dados.descricao().trim();
    this.valor = dados.valor();
    this.atualizadoEm = momento;
  }

  public boolean estaConcluida() {
    return status == StatusDaManutencao.CONCLUIDA;
  }

  public void concluir(Instant momento) {
    this.status = StatusDaManutencao.CONCLUIDA;
    this.atualizadoEm = momento;
  }

  /** O caminho de volta do engano: concluiu a errada, reabre e ela volta às programadas. */
  public void reabrir(Instant momento) {
    this.status = StatusDaManutencao.PROGRAMADA;
    this.atualizadoEm = momento;
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

  public LocalTime getHora() {
    return hora;
  }

  public String getResponsavel() {
    return responsavel;
  }

  public String getDescricao() {
    return descricao;
  }

  public BigDecimal getValor() {
    return valor;
  }

  public StatusDaManutencao getStatus() {
    return status;
  }

  public Instant getCriadoEm() {
    return criadoEm;
  }

  public Instant getAtualizadoEm() {
    return atualizadoEm;
  }
}
