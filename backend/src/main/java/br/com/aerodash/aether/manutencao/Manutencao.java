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

  /** Programar com mais atraso que isso não é registro tardio, é ano digitado errado. */
  private static final int ANOS_DE_ATRASO = 1;

  private static final int ANOS_DE_ANTECEDENCIA = 10;

  /** Antes disso, a data de conclusão é ano digitado errado. */
  private static final LocalDate PRIMEIRA_CONCLUSAO = LocalDate.of(2000, 1, 1);

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

  /** O dia em que a manutenção foi feita, informado ao concluir. Nulo enquanto programada. */
  @Column(name = "concluida_em")
  private LocalDate concluidaEm;

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
    this.responsavel = Espacos.apararOuNulo(dados.responsavel());
    this.descricao = Espacos.aparar(dados.descricao());
    this.valor = dados.valor();
    this.atualizadoEm = momento;
  }

  /** A primeira data programável: o registro tardio do que já devia ter acontecido. */
  public static LocalDate primeiraDataProgramavel(LocalDate hoje) {
    return hoje.minusYears(ANOS_DE_ATRASO);
  }

  public static LocalDate ultimaDataProgramavel(LocalDate hoje) {
    return hoje.plusYears(ANOS_DE_ANTECEDENCIA);
  }

  /** Data passada dentro da janela é aceita: a manutenção nasce atrasada, e a tela avisa. */
  public boolean possuiDataProgramavel(LocalDate hoje) {
    return !data.isBefore(primeiraDataProgramavel(hoje))
        && !data.isAfter(ultimaDataProgramavel(hoje));
  }

  public boolean estaConcluida() {
    return status == StatusDaManutencao.CONCLUIDA;
  }

  /** Só a programada se corrige: a concluída é histórico, e o caminho do engano é reabrir. */
  public boolean podeSerCorrigida() {
    return !estaConcluida();
  }

  /** A conclusão vem no máximo um ano antes da data programada, e nunca antes de 2000. */
  public LocalDate primeiraDataDeConclusao() {
    LocalDate umAnoAntes = data.minusYears(1);
    return umAnoAntes.isBefore(PRIMEIRA_CONCLUSAO) ? PRIMEIRA_CONCLUSAO : umAnoAntes;
  }

  public boolean aceitaConclusaoEm(LocalDate dia) {
    return !dia.isBefore(primeiraDataDeConclusao());
  }

  public void concluir(LocalDate dia, Instant momento) {
    this.status = StatusDaManutencao.CONCLUIDA;
    this.concluidaEm = dia;
    this.atualizadoEm = momento;
  }

  /** O caminho de volta do engano: concluiu a errada, reabre e ela volta às programadas. */
  public void reabrir(Instant momento) {
    this.status = StatusDaManutencao.PROGRAMADA;
    this.concluidaEm = null;
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

  public LocalDate getConcluidaEm() {
    return concluidaEm;
  }

  public Instant getCriadoEm() {
    return criadoEm;
  }

  public Instant getAtualizadoEm() {
    return atualizadoEm;
  }
}
