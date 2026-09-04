package br.com.aerodash.aether.saude;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Duration;
import java.time.Instant;

/**
 * Situação conhecida de um componente da plataforma.
 *
 * <p>As regras que dependem apenas do estado deste objeto ficam aqui, não no service: é isso que
 * impede o {@code SaudeService} de engordar. Veja {@code docs/arquitetura.md}.
 */
@Entity
@Table(name = "registro_de_saude")
public class RegistroDeSaude {

  /** Acima desta idade a verificação deixa de ser confiável. */
  private static final Duration JANELA_DE_FRESCOR = Duration.ofMinutes(5);

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "componente", nullable = false, unique = true, length = 60)
  private String componente;

  @Enumerated(EnumType.STRING)
  @Column(name = "situacao", nullable = false, length = 20)
  private SituacaoDeSaude situacao;

  @Column(name = "verificado_em", nullable = false)
  private Instant verificadoEm;

  /** Exigido pelo JPA. */
  protected RegistroDeSaude() {}

  public RegistroDeSaude(String componente, SituacaoDeSaude situacao, Instant verificadoEm) {
    this.componente = componente;
    this.situacao = situacao;
    this.verificadoEm = verificadoEm;
  }

  /** Marca que o componente acabou de ser verificado, com o resultado observado. */
  public void registrarVerificacao(SituacaoDeSaude situacaoObservada, Instant momento) {
    this.situacao = situacaoObservada;
    this.verificadoEm = momento;
  }

  public boolean estaOperante() {
    return situacao == SituacaoDeSaude.OPERANTE;
  }

  public boolean estaIndisponivel() {
    return situacao == SituacaoDeSaude.INDISPONIVEL;
  }

  public boolean possuiVerificacaoRecente(Instant agora) {
    return !verificadoEm.isBefore(agora.minus(JANELA_DE_FRESCOR));
  }

  /** Um componente só conta como saudável se está operante e foi verificado há pouco. */
  public boolean estaSaudavel(Instant agora) {
    return estaOperante() && possuiVerificacaoRecente(agora);
  }

  public Long getId() {
    return id;
  }

  public String getComponente() {
    return componente;
  }

  public SituacaoDeSaude getSituacao() {
    return situacao;
  }

  public Instant getVerificadoEm() {
    return verificadoEm;
  }
}
