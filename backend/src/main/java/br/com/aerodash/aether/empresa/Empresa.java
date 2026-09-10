package br.com.aerodash.aether.empresa;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

/**
 * A empresa dona desta instalação. Sempre uma linha, garantida por CHECK no banco.
 *
 * <p>Não é inquilino: isolar dados por empresa é outra decisão, com ADR próprio. Aqui moram os
 * dados da conta e a política de aviso de vencimento que governa a tela de Aeronaves.
 */
@Entity
@Table(name = "empresa")
public class Empresa {

  /** A única linha. O id é fixo porque o CHECK do banco o exige. */
  public static final long ID = 1L;

  private static final int MINIMO_DE_DIAS = 1;
  private static final int MAXIMO_DE_DIAS = 365;

  @Id
  @Column(name = "id", nullable = false)
  private Long id;

  @Column(name = "nome_fantasia", nullable = false, length = 120)
  private String nomeFantasia;

  @Column(name = "razao_social", nullable = false, length = 180)
  private String razaoSocial;

  @Column(name = "cnpj", nullable = false, length = 14, updatable = false)
  private String cnpj;

  @Column(name = "email", nullable = false, length = 180)
  private String email;

  @Column(name = "telefone", nullable = false, length = 20)
  private String telefone;

  @Column(name = "dias_de_aviso", nullable = false)
  private int diasDeAviso;

  @Column(name = "criado_em", nullable = false)
  private Instant criadoEm;

  @Column(name = "atualizado_em", nullable = false)
  private Instant atualizadoEm;

  /** Exigido pelo JPA. */
  protected Empresa() {}

  /**
   * A linha nasce na migration, e não por este construtor: em produção a empresa é criada junto com
   * o esquema. Existe para os testes montarem o estado sem ir ao banco.
   */
  Empresa(String cnpj, int diasDeAviso, Instant momento) {
    this.id = ID;
    this.cnpj = cnpj;
    this.diasDeAviso = diasDeAviso;
    this.criadoEm = momento;
    this.atualizadoEm = momento;
  }

  /**
   * Edita os dados de contato. O CNPJ não está aqui, e a ausência é a regra: ele é o documento do
   * contrato, e trocá-lo é trocar de empresa, não editar um campo. A coluna é {@code updatable =
   * false} para que nem um engano de código consiga.
   */
  public void alterarDados(
      String nomeFantasia, String razaoSocial, String email, String telefone, Instant momento) {
    this.nomeFantasia = nomeFantasia;
    this.razaoSocial = razaoSocial;
    this.email = email;
    this.telefone = telefone;
    this.atualizadoEm = momento;
  }

  /**
   * Muda a antecedência do aviso de vencimento.
   *
   * <p>A faixa é validada aqui, e não só no banco, porque a mensagem de erro que a pessoa lê tem
   * que vir do domínio — o CHECK do banco protege o dado, não explica nada a ninguém.
   */
  public void alterarAvisoDeVencimento(int dias, Instant momento) {
    if (!aceitaAviso(dias)) {
      throw new AvisoDeVencimentoInvalidoException(MINIMO_DE_DIAS, MAXIMO_DE_DIAS);
    }
    this.diasDeAviso = dias;
    this.atualizadoEm = momento;
  }

  public static boolean aceitaAviso(int dias) {
    return dias >= MINIMO_DE_DIAS && dias <= MAXIMO_DE_DIAS;
  }

  public Long getId() {
    return id;
  }

  public String getNomeFantasia() {
    return nomeFantasia;
  }

  public String getRazaoSocial() {
    return razaoSocial;
  }

  public String getCnpj() {
    return cnpj;
  }

  public String getEmail() {
    return email;
  }

  public String getTelefone() {
    return telefone;
  }

  public int getDiasDeAviso() {
    return diasDeAviso;
  }

  public Instant getAtualizadoEm() {
    return atualizadoEm;
  }
}
