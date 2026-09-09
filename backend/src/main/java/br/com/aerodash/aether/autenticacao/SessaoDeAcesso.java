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
 * Sessão aberta por um usuário. O cookie leva o token em claro; aqui fica só o hash dele.
 *
 * <p>A sessão é gravada no banco, e não assinada num JWT, porque encerrar precisa ser imediato:
 * apagar a linha corta o acesso no próximo request. Ver {@code docs/adr/0013-sessao-opaca.md}.
 */
@Entity
@Table(name = "sessao_de_acesso")
public class SessaoDeAcesso {

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

  @Column(name = "encerrada_em")
  private Instant encerradaEm;

  @Column(name = "criado_em", nullable = false)
  private Instant criadoEm;

  /** Exigido pelo JPA. */
  protected SessaoDeAcesso() {}

  public SessaoDeAcesso(
      Usuario usuario, String tokenCodificado, Instant momento, Duration duracao) {
    this.usuario = usuario;
    this.token = tokenCodificado;
    this.criadoEm = momento;
    this.expiraEm = momento.plus(duracao);
  }

  public boolean estaEncerrada() {
    return encerradaEm != null;
  }

  public boolean estaExpirada(Instant agora) {
    return !expiraEm.isAfter(agora);
  }

  public boolean estaVigente(Instant agora) {
    return !estaEncerrada() && !estaExpirada(agora);
  }

  public void encerrar(Instant momento) {
    if (encerradaEm == null) {
      this.encerradaEm = momento;
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
