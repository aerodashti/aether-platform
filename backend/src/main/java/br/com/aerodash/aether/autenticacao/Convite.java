package br.com.aerodash.aether.autenticacao;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Duration;
import java.time.Instant;

/**
 * Link de uso único pelo qual a pessoa convidada cria a própria senha.
 *
 * <p>É um caminho separado da recuperação de senha, e não uma flexibilização dela: recuperar exige
 * conta ATIVA com senha, justamente para que "esqueci minha senha" não vire uma forma de assumir
 * uma conta que nunca foi ativada. Quem foi convidado está exatamente nessa condição.
 *
 * <p>O token segue o tratamento da sessão — sorteado com 256 bits e guardado pelo SHA-256 —, e não
 * o do código de recuperação, que é BCrypt porque seis dígitos precisam de hash lento.
 */
@Entity
@Table(name = "convite")
public class Convite {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(optional = false)
  @JoinColumn(name = "usuario_id", nullable = false)
  private Usuario usuario;

  @Column(name = "token", nullable = false, unique = true, length = 100)
  private String token;

  @Column(name = "expira_em", nullable = false)
  private Instant expiraEm;

  @Column(name = "usado_em")
  private Instant usadoEm;

  @Column(name = "criado_em", nullable = false)
  private Instant criadoEm;

  /** Exigido pelo JPA. */
  protected Convite() {}

  public Convite(Usuario usuario, String tokenCodificado, Instant momento, Duration validade) {
    this.usuario = usuario;
    this.token = tokenCodificado;
    this.criadoEm = momento;
    this.expiraEm = momento.plus(validade);
  }

  public boolean foiUsado() {
    return usadoEm != null;
  }

  public boolean estaExpirado(Instant agora) {
    return !expiraEm.isAfter(agora);
  }

  public boolean estaVigente(Instant agora) {
    return !foiUsado() && !estaExpirado(agora);
  }

  /** Reenviar não é gerar um segundo convite válido: o anterior morre quando o novo nasce. */
  public void invalidar(Instant momento) {
    marcarComoUsado(momento);
  }

  public void marcarComoUsado(Instant momento) {
    if (usadoEm == null) {
      this.usadoEm = momento;
    }
  }

  public Long getId() {
    return id;
  }

  public Usuario getUsuario() {
    return usuario;
  }

  public Instant getExpiraEm() {
    return expiraEm;
  }

  public Instant getCriadoEm() {
    return criadoEm;
  }
}
