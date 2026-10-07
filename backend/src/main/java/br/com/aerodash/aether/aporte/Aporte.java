package br.com.aerodash.aether.aporte;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
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
 * Dinheiro que um proprietário transferiu para o fundo de uma aeronave.
 *
 * <p>É registrado como recebido, nunca como previsto: a data do crédito não pode estar no futuro. A
 * competência é independente da data porque o aporte de um mês costuma cair no começo do outro.
 */
@Entity
@Table(name = "aporte")
public class Aporte {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "aeronave_id", nullable = false)
  private Long aeronaveId;

  @Column(name = "proprietario_id", nullable = false)
  private Long proprietarioId;

  @Column(name = "data", nullable = false)
  private LocalDate data;

  @Convert(converter = ConversorDeCompetencia.class)
  @Column(name = "competencia", nullable = false)
  private YearMonth competencia;

  @Column(name = "valor", nullable = false, precision = 14, scale = 2)
  private BigDecimal valor;

  @Column(name = "criado_em", nullable = false)
  private Instant criadoEm;

  @Column(name = "atualizado_em", nullable = false)
  private Instant atualizadoEm;

  /** Exigido pelo JPA. */
  protected Aporte() {}

  public Aporte(
      Long aeronaveId,
      Long proprietarioId,
      LocalDate data,
      YearMonth competencia,
      BigDecimal valor,
      Instant momento) {
    this.aeronaveId = aeronaveId;
    this.criadoEm = momento;
    atualizar(proprietarioId, data, competencia, valor, momento);
  }

  public final void atualizar(
      Long proprietarioId,
      LocalDate data,
      YearMonth competencia,
      BigDecimal valor,
      Instant momento) {
    this.proprietarioId = proprietarioId;
    this.data = data;
    this.competencia = competencia;
    this.valor = valor;
    this.atualizadoEm = momento;
  }

  /** Aporte é dinheiro que já caiu: crédito com data futura é previsão, e previsão não entra. */
  public boolean estaNoFuturo(LocalDate hoje) {
    return data.isAfter(hoje);
  }

  public boolean estaAntesDaPrimeiraData() {
    return data.isBefore(CalendarioDoFundo.PRIMEIRA_DATA);
  }

  /**
   * A competência cabe na mesma janela dos recortes do fundo: o aporte anual antecipado chega a um
   * ano à frente, e fora dela o aporte sumiria de todo recorte que alguém consulta.
   */
  public boolean possuiCompetenciaAceitavel(YearMonth corrente) {
    return JanelaDeCompetencias.aPartirDa(corrente).aceita(competencia);
  }

  public Long getId() {
    return id;
  }

  public Long getAeronaveId() {
    return aeronaveId;
  }

  public Long getProprietarioId() {
    return proprietarioId;
  }

  public LocalDate getData() {
    return data;
  }

  public YearMonth getCompetencia() {
    return competencia;
  }

  public BigDecimal getValor() {
    return valor;
  }
}
