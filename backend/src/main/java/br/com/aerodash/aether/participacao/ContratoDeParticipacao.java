package br.com.aerodash.aether.participacao;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Um contrato de participação: a foto de quem é dono de quanto da aeronave, de um instante até o
 * próximo contrato.
 *
 * <p>Contrato não se edita — se arquiva. Alterar participações cria um contrato novo e encerra o
 * vigente; é o que preserva o histórico que o rateio de competências passadas vai consultar. O
 * vigente é o de {@code fimDaVigencia} nulo.
 */
@Entity
@Table(name = "contrato_de_participacao")
public class ContratoDeParticipacao {

  /** A soma exata que todo contrato precisa fechar. */
  public static final BigDecimal SOMA_TOTAL = new BigDecimal("100.00");

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "aeronave_id", nullable = false)
  private Long aeronaveId;

  @Column(name = "inicio_da_vigencia", nullable = false)
  private Instant inicioDaVigencia;

  @Column(name = "fim_da_vigencia")
  private Instant fimDaVigencia;

  /** Nome de quem salvou, gravado no ato: o histórico mostra "alterado por" para sempre. */
  @Column(name = "criado_por", nullable = false, length = 120)
  private String criadoPor;

  @OneToMany(
      mappedBy = "contrato",
      cascade = CascadeType.ALL,
      orphanRemoval = true,
      fetch = FetchType.LAZY)
  @OrderBy("percentual DESC, id ASC")
  private List<Participacao> participacoes = new ArrayList<>();

  /** Exigido pelo JPA. */
  protected ContratoDeParticipacao() {}

  public ContratoDeParticipacao(Long aeronaveId, String criadoPor, Instant momento) {
    this.aeronaveId = aeronaveId;
    this.criadoPor = criadoPor;
    this.inicioDaVigencia = momento;
  }

  /**
   * Inclui a participação de um proprietário. O contrato defende as próprias invariantes — cada
   * proprietário uma vez só, percentual de 0,01 a 100 com duas casas —, mesmo quando quem chama já
   * conferiu: é o que impede um caminho novo de gravar um contrato que o banco recusaria.
   */
  public void adicionarParticipacao(Long proprietarioId, BigDecimal percentual) {
    if (possuiParticipacaoDe(proprietarioId)) {
      throw new ContratoInvalidoException("Cada proprietário entra uma única vez no contrato.");
    }
    Participacao participacao = new Participacao(this, proprietarioId, percentual);
    if (!participacao.possuiPercentualValido()) {
      throw new ContratoInvalidoException(
          "A participação vai de 0,01% a 100%, com no máximo duas casas decimais.");
    }
    participacoes.add(participacao);
  }

  public boolean possuiParticipacaoDe(Long proprietarioId) {
    return participacoes.stream()
        .anyMatch(participacao -> participacao.getProprietarioId().equals(proprietarioId));
  }

  public boolean estaVigente() {
    return fimDaVigencia == null;
  }

  /** Encerrar é o único jeito de um contrato deixar de valer; nada aqui apaga participação. */
  public void encerrar(Instant momento) {
    this.fimDaVigencia = momento;
  }

  public BigDecimal somaDosPercentuais() {
    return participacoes.stream()
        .map(Participacao::getPercentual)
        .reduce(BigDecimal.ZERO, BigDecimal::add);
  }

  /** Fecha em 100 exatos, com alguém dentro: contrato sem proprietário não é contrato. */
  public boolean somaFecha() {
    return !participacoes.isEmpty() && somaDosPercentuais().compareTo(SOMA_TOTAL) == 0;
  }

  /** Mesmos proprietários com os mesmos percentuais, em qualquer ordem. */
  public boolean possuiAsMesmasParticipacoes(List<Participacao> outras) {
    if (participacoes.size() != outras.size()) {
      return false;
    }
    return participacoes.stream()
        .allMatch(
            minha ->
                outras.stream()
                    .anyMatch(
                        outra ->
                            outra.getProprietarioId().equals(minha.getProprietarioId())
                                && outra.getPercentual().compareTo(minha.getPercentual()) == 0));
  }

  public Long getId() {
    return id;
  }

  public Long getAeronaveId() {
    return aeronaveId;
  }

  public Instant getInicioDaVigencia() {
    return inicioDaVigencia;
  }

  public Instant getFimDaVigencia() {
    return fimDaVigencia;
  }

  public String getCriadoPor() {
    return criadoPor;
  }

  public List<Participacao> getParticipacoes() {
    return participacoes;
  }
}
