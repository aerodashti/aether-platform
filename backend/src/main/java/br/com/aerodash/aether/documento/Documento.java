package br.com.aerodash.aether.documento;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Um arquivo anexado a uma aeronave. O banco guarda o que se lista; o conteúdo mora no
 * armazenamento, sob uma chave que o Aether gera — o nome dado pelo usuário é só rótulo.
 */
@Entity
@Table(name = "documento")
public class Documento {

  /** O limite do envio, que o multipart do Spring também aplica antes de o arquivo chegar aqui. */
  public static final long TAMANHO_MAXIMO = 20L * 1024 * 1024;

  private static final int NOME_MAXIMO = 200;

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "aeronave_id", nullable = false)
  private Long aeronaveId;

  @Column(name = "nome", nullable = false, length = NOME_MAXIMO)
  private String nome;

  @Column(name = "tipo_de_conteudo", nullable = false, length = 120)
  private String tipoDeConteudo;

  @Column(name = "tamanho", nullable = false)
  private long tamanho;

  @Column(name = "chave", nullable = false, length = 80, unique = true)
  private String chave;

  @Column(name = "enviado_por", nullable = false, length = 120)
  private String enviadoPor;

  @Column(name = "criado_em", nullable = false)
  private Instant criadoEm;

  /** Exigido pelo JPA. */
  protected Documento() {}

  public Documento(
      Long aeronaveId,
      String nomeOriginal,
      TipoDeArquivo tipo,
      long tamanho,
      String enviadoPor,
      Instant momento) {
    this.aeronaveId = aeronaveId;
    this.nome = nomeLimpo(nomeOriginal);
    this.tipoDeConteudo = tipo.getTipoDeConteudo();
    this.tamanho = tamanho;
    this.chave = UUID.randomUUID().toString();
    this.enviadoPor = enviadoPor;
    this.criadoEm = momento;
  }

  /**
   * O nome como rótulo: sem o caminho que alguns navegadores mandam junto ("C:\\fakepath\\..."),
   * sem caracteres de controle e com no máximo 200 caracteres, preservando a extensão.
   */
  public static String nomeLimpo(String original) {
    String semCaminho = original == null ? "" : original.replace('\\', '/');
    semCaminho = semCaminho.substring(semCaminho.lastIndexOf('/') + 1);
    String limpo = semCaminho.replaceAll("\\p{Cntrl}", "").strip();
    if (limpo.length() <= NOME_MAXIMO) {
      return limpo;
    }
    int ponto = limpo.lastIndexOf('.');
    String extensao = ponto > 0 && limpo.length() - ponto <= 10 ? limpo.substring(ponto) : "";
    return limpo.substring(0, NOME_MAXIMO - extensao.length()) + extensao;
  }

  public static boolean cabeNoLimite(long tamanho) {
    return tamanho > 0 && tamanho <= TAMANHO_MAXIMO;
  }

  public Long getId() {
    return id;
  }

  public Long getAeronaveId() {
    return aeronaveId;
  }

  public String getNome() {
    return nome;
  }

  public String getTipoDeConteudo() {
    return tipoDeConteudo;
  }

  public long getTamanho() {
    return tamanho;
  }

  public String getChave() {
    return chave;
  }

  public String getEnviadoPor() {
    return enviadoPor;
  }

  public Instant getCriadoEm() {
    return criadoEm;
  }
}
