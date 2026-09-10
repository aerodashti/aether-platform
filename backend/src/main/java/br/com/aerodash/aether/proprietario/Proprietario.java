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

/**
 * Pessoa física ou jurídica titular de participação em aeronaves.
 *
 * <p>Distinto de {@code Usuario}: o titular existe no domínio exista ou não acesso ao sistema — ver
 * o glossário. Hoje o proprietário é só cadastro; a participação por aeronave e o saldo do fundo
 * entram com as features donas de cada um.
 */
@Entity
@Table(name = "proprietario")
public class Proprietario {

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
    this.nome = nome.trim();
    this.cpfCnpj = normalizarCpfCnpj(cpfCnpj);
    this.email = normalizarEmail(email);
    this.telefone = normalizarTelefone(telefone);
    this.corDeIdentificacao = corDeIdentificacao;
    this.situacao = SituacaoDoProprietario.ATIVO;
    this.criadoEm = momento;
    this.atualizadoEm = momento;
  }

  /**
   * O documento é gravado só com dígitos: "123.456.789-01" e "12345678901" são a mesma pessoa, e a
   * unicidade do banco só funciona se a forma for uma. Vazio vira {@code null} — cadastro sem
   * documento é permitido até o contrato de participação exigi-lo.
   */
  public static String normalizarCpfCnpj(String cpfCnpj) {
    if (cpfCnpj == null) {
      return null;
    }
    String digitos = cpfCnpj.replaceAll("\\D", "");
    return digitos.isEmpty() ? null : digitos;
  }

  /** 11 dígitos é CPF, 14 é CNPJ; qualquer outro comprimento é erro de digitação. */
  public static boolean cpfCnpjEhValido(String cpfCnpjNormalizado) {
    return cpfCnpjNormalizado == null
        || cpfCnpjNormalizado.length() == 11
        || cpfCnpjNormalizado.length() == 14;
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
    this.nome = nome.trim();
    this.cpfCnpj = normalizarCpfCnpj(cpfCnpj);
    this.email = normalizarEmail(email);
    this.telefone = normalizarTelefone(telefone);
    this.corDeIdentificacao = corDeIdentificacao;
    this.atualizadoEm = momento;
  }

  /**
   * Desativar não apaga: o histórico continua apontando para a pessoa. Quando o contrato de
   * participação existir, é ele que vai exigir o rebalanceamento antes de chegar aqui.
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
