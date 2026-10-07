package br.com.aerodash.aether.proprietario;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Pessoa física ou jurídica titular de participação em aeronaves.
 *
 * <p>Distinto de {@code Usuario}: o titular existe no domínio exista ou não acesso ao sistema — ver
 * o glossário. A participação por aeronave e o saldo do fundo moram nas features donas de cada um
 * ({@code participacao} e {@code fechamento}).
 */
@Entity
@Table(name = "proprietario")
public class Proprietario {

  /** Caracteres de formatação — espaço de largura zero, marca de direção —, que não se veem. */
  private static final Pattern INVISIVEIS = Pattern.compile("\\p{Cf}");

  /** Espaço comum, não separável e afins nas pontas. */
  private static final Pattern ESPACOS_NAS_PONTAS = Pattern.compile("^[\\s\\p{Z}]+|[\\s\\p{Z}]+$");

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "nome", nullable = false, length = 120)
  private String nome;

  @Column(name = "cpf_cnpj", unique = true, length = 14)
  private String cpfCnpj;

  @Column(name = "email", length = 180)
  private String email;

  @Column(name = "telefone", length = 20)
  private String telefone;

  @Enumerated(EnumType.STRING)
  @Column(name = "cor_de_identificacao", nullable = false, length = 20)
  private CorDeIdentificacao corDeIdentificacao;

  @Enumerated(EnumType.STRING)
  @Column(name = "situacao", nullable = false, length = 10)
  private SituacaoDoProprietario situacao;

  @Column(name = "criado_em", nullable = false)
  private Instant criadoEm;

  @Column(name = "atualizado_em", nullable = false)
  private Instant atualizadoEm;

  /** Exigido pelo JPA. */
  protected Proprietario() {}

  public Proprietario(
      String nome,
      String cpfCnpj,
      String email,
      String telefone,
      CorDeIdentificacao corDeIdentificacao,
      Instant momento) {
    this.nome = normalizarNome(nome);
    this.cpfCnpj = CpfCnpj.normalizar(cpfCnpj);
    this.email = normalizarEmail(email);
    this.telefone = normalizarTelefone(telefone);
    this.corDeIdentificacao = corDeIdentificacao;
    this.situacao = SituacaoDoProprietario.ATIVO;
    this.criadoEm = momento;
    this.atualizadoEm = momento;
  }

  /**
   * O nome sem o que não se vê. Um espaço de largura zero colado de um PDF faria dois cadastros
   * parecerem a mesma pessoa, e um nome feito só disso seria um nome em branco na grade.
   */
  static String normalizarNome(String nome) {
    String visivel = INVISIVEIS.matcher(nome).replaceAll("");
    return ESPACOS_NAS_PONTAS.matcher(visivel).replaceAll("");
  }

  public static String normalizarEmail(String email) {
    if (email == null) {
      return null;
    }
    String limpo = email.trim().toLowerCase(Locale.ROOT);
    return limpo.isEmpty() ? null : limpo;
  }

  private static String normalizarTelefone(String telefone) {
    if (telefone == null) {
      return null;
    }
    String limpo = telefone.trim();
    return limpo.isEmpty() ? null : limpo;
  }

  public boolean estaAtivo() {
    return situacao == SituacaoDoProprietario.ATIVO;
  }

  public boolean possuiCpfCnpj() {
    return cpfCnpj != null;
  }

  public void atualizarCadastro(
      String nome,
      String cpfCnpj,
      String email,
      String telefone,
      CorDeIdentificacao corDeIdentificacao,
      Instant momento) {
    this.nome = normalizarNome(nome);
    this.cpfCnpj = CpfCnpj.normalizar(cpfCnpj);
    this.email = normalizarEmail(email);
    this.telefone = normalizarTelefone(telefone);
    this.corDeIdentificacao = corDeIdentificacao;
    this.atualizadoEm = momento;
  }

  /**
   * Desativar não apaga: o histórico continua apontando para a pessoa. Quem está num contrato
   * vigente sai antes pela redistribuição da participação ({@code SaidaDeProprietarioService}).
   */
  public void desativar(Instant momento) {
    this.situacao = SituacaoDoProprietario.INATIVO;
    this.atualizadoEm = momento;
  }

  public void reativar(Instant momento) {
    this.situacao = SituacaoDoProprietario.ATIVO;
    this.atualizadoEm = momento;
  }

  public Long getId() {
    return id;
  }

  public String getNome() {
    return nome;
  }

  public String getCpfCnpj() {
    return cpfCnpj;
  }

  public String getEmail() {
    return email;
  }

  public String getTelefone() {
    return telefone;
  }

  public CorDeIdentificacao getCorDeIdentificacao() {
    return corDeIdentificacao;
  }

  public SituacaoDoProprietario getSituacao() {
    return situacao;
  }

  public Instant getCriadoEm() {
    return criadoEm;
  }

  public Instant getAtualizadoEm() {
    return atualizadoEm;
  }
}
