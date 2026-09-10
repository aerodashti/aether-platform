package br.com.aerodash.aether.participacao;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;

/**
 * A fatia de um proprietário num contrato: o percentual de propriedade.
 *
 * <p>O percentual do rateio não mora aqui — quando a base do rateio é por uso, ele é derivado das
 * horas voadas na competência; quando é por propriedade, é este número. A tela mostra a diferença.
 */
@Entity
@Table(name = "participacao")
public class Participacao {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "contrato_id", nullable = false)
  private ContratoDeParticipacao contrato;

  @Column(name = "proprietario_id", nullable = false)
  private Long proprietarioId;

  /** De 0,01 a 100,00, com duas casas: é assim que contrato de participação se escreve. */
  @Column(name = "percentual", nullable = false, precision = 5, scale = 2)
  private BigDecimal percentual;

  /** Exigido pelo JPA. */
  protected Participacao() {}

  Participacao(ContratoDeParticipacao contrato, Long proprietarioId, BigDecimal percentual) {
    this.contrato = contrato;
    this.proprietarioId = proprietarioId;
    this.percentual = percentual;
  }

  public boolean possuiPercentualValido() {
    return percentual != null
        && percentual.signum() > 0
        && percentual.compareTo(ContratoDeParticipacao.SOMA_TOTAL) <= 0;
  }

  public Long getId() {
    return id;
  }

  public Long getProprietarioId() {
    return proprietarioId;
  }

  public BigDecimal getPercentual() {
    return percentual;
  }
}
