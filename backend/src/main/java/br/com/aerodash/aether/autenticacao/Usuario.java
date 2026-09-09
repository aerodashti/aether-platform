package br.com.aerodash.aether.autenticacao;

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
import java.util.Locale;
import java.util.Optional;

/**
 * Pessoa com acesso ao Aether.
 *
 * <p>As regras de quem pode entrar moram aqui, não no service: se um {@code if} olha só para o
 * estado deste objeto, ele pertence a este objeto. Veja {@code docs/arquitetura.md}.
 */
@Entity
@Table(name = "usuario")
public class Usuario {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "nome", nullable = false, length = 120)
  private String nome;

  @Column(name = "email", nullable = false, unique = true, length = 180)
  private String email;

  @Column(name = "senha", length = 100)
  private String senha;

  @Enumerated(EnumType.STRING)
  @Column(name = "situacao", nullable = false, length = 20)
  private SituacaoDoUsuario situacao;

  @Column(name = "tentativas", nullable = false)
  private int tentativas;

  @Column(name = "bloqueado_ate")
  private Instant bloqueadoAte;

  @Column(name = "criado_em", nullable = false)
  private Instant criadoEm;

  @Column(name = "atualizado_em", nullable = false)
  private Instant atualizadoEm;

  /** Exigido pelo JPA. */
  protected Usuario() {}

  /** Nasce PENDENTE e sem senha: quem cria a senha é a própria pessoa, pelo link do convite. */
  public Usuario(String nome, String email, Instant momento) {
    this.nome = nome;
    this.email = normalizarEmail(email);
    this.situacao = SituacaoDoUsuario.PENDENTE;
    this.tentativas = 0;
    this.criadoEm = momento;
    this.atualizadoEm = momento;
  }

  /** O e-mail é a chave de entrada: não pode depender de como a pessoa digitou. */
  public static String normalizarEmail(String email) {
    return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
  }

  public boolean estaAtivo() {
    return situacao == SituacaoDoUsuario.ATIVO;
  }

  public boolean possuiSenha() {
    return senha != null;
  }

  public boolean estaBloqueado(Instant agora) {
    return bloqueadoAte != null && bloqueadoAte.isAfter(agora);
  }

  /** Só entra quem está ativo, já criou senha e não está cumprindo bloqueio por tentativas. */
  public boolean podeEntrar(Instant agora) {
    return estaAtivo() && possuiSenha() && !estaBloqueado(agora);
  }

  /**
   * Só quem já tem acesso pode recuperá-lo. Um usuário PENDENTE não entra por aqui: o caminho dele
   * é o link do convite, e deixar a recuperação valer para ele transformaria "esqueci minha senha"
   * em uma forma de assumir uma conta que nunca foi ativada.
   */
  public boolean podeRecuperarSenha() {
    return estaAtivo() && possuiSenha();
  }

  /** Conta a falha e, ao atingir o limite, tranca a conta pelo tempo configurado. */
  public void registrarFalhaDeEntrada(Instant agora, int limite, Duration bloqueio) {
    this.tentativas = tentativas + 1;
    if (tentativas >= limite) {
      this.bloqueadoAte = agora.plus(bloqueio);
      this.tentativas = 0;
    }
    this.atualizadoEm = agora;
  }

  /** Entrada bem-sucedida zera o que a sequência de falhas tinha acumulado. */
  public void registrarEntrada(Instant agora) {
    this.tentativas = 0;
    this.bloqueadoAte = null;
    this.atualizadoEm = agora;
  }

  /**
   * Definir a senha ativa o usuário e libera qualquer bloqueio: quem provou ter acesso ao e-mail
   * cadastrado não deve continuar preso à contagem de tentativas de quem errava a senha antiga.
   */
  public void definirSenha(String senhaCodificada, Instant agora) {
    this.senha = senhaCodificada;
    this.situacao = SituacaoDoUsuario.ATIVO;
    this.tentativas = 0;
    this.bloqueadoAte = null;
    this.atualizadoEm = agora;
  }

  public Long getId() {
    return id;
  }

  public String getNome() {
    return nome;
  }

  public String getEmail() {
    return email;
  }

  /** O hash, nunca a senha. Vazio enquanto o convite não foi concluído. */
  public Optional<String> getSenha() {
    return Optional.ofNullable(senha);
  }

  public SituacaoDoUsuario getSituacao() {
    return situacao;
  }

  public int getTentativas() {
    return tentativas;
  }

  public Optional<Instant> getBloqueadoAte() {
    return Optional.ofNullable(bloqueadoAte);
  }

  public Instant getCriadoEm() {
    return criadoEm;
  }

  public Instant getAtualizadoEm() {
    return atualizadoEm;
  }
}
