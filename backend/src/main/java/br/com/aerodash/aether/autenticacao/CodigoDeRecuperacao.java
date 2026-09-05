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
 * Código de seis dígitos enviado por e-mail para redefinir a senha.
 *
 * <p>Seis dígitos são um milhão de possibilidades — pouco para resistir a força bruta. O que
 * protege não é o segredo: é a soma de hash lento, validade curta e limite de tentativas, e as três
 * condições são verificadas aqui.
 */
@Entity
@Table(name = "codigo_de_recuperacao")
public class CodigoDeRecuperacao {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(optional = false)
  @JoinColumn(name = "usuario_id", nullable = false)
  private Usuario usuario;

  @Column(name = "codigo", nullable = false, length = 100)
  private String codigo;

  @Column(name = "expira_em", nullable = false)
  private Instant expiraEm;

  @Column(name = "usado_em")
  private Instant usadoEm;

  @Column(name = "tentativas", nullable = false)
  private int tentativas;

  @Column(name = "criado_em", nullable = false)
  private Instant criadoEm;

  /** Exigido pelo JPA. */
  protected CodigoDeRecuperacao() {}

  public CodigoDeRecuperacao(
      Usuario usuario, String codigoCodificado, Instant momento, Duration validade) {
    this.usuario = usuario;
    this.codigo = codigoCodificado;
    this.criadoEm = momento;
    this.expiraEm = momento.plus(validade);
    this.tentativas = 0;
  }

  public boolean estaExpirado(Instant agora) {
    return !expiraEm.isAfter(agora);
  }

  public boolean foiUsado() {
    return usadoEm != null;
  }

  public boolean excedeuTentativas(int limite) {
    return tentativas >= limite;
  }

  /** Vale só o código que ainda não foi usado, não expirou e não esgotou as tentativas. */
  public boolean estaVigente(Instant agora, int limiteDeTentativas) {
    return !foiUsado() && !estaExpirado(agora) && !excedeuTentativas(limiteDeTentativas);
  }

  /**
   * Um novo código só pode ser pedido depois deste intervalo, para que o botão "Reenviar código"
   * não vire um disparador de e-mail contra a caixa de entrada de outra pessoa.
   */
  public boolean permiteNovoEnvio(Instant agora, Duration intervaloMinimo) {
    return !criadoEm.plus(intervaloMinimo).isAfter(agora);
  }

  public void registrarTentativa() {
    this.tentativas = tentativas + 1;
  }

  public void marcarComoUsado(Instant momento) {
    this.usadoEm = momento;
  }

  public Long getId() {
    return id;
  }

  public Usuario getUsuario() {
    return usuario;
  }

  /** O hash, nunca o código digitado. */
  public String getCodigo() {
    return codigo;
  }

  public Instant getExpiraEm() {
    return expiraEm;
  }

  public int getTentativas() {
    return tentativas;
  }

  public Instant getCriadoEm() {
    return criadoEm;
  }
}
