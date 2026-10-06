package br.com.aerodash.aether.aviso;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

/** A marca de que um usuário leu um aviso. Leitura é de cada um: o que um lê, o outro não. */
@Entity
@Table(name = "aviso_lido")
public class AvisoLido {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "usuario_id", nullable = false)
  private Long usuarioId;

  @Column(name = "chave", nullable = false, length = 120)
  private String chave;

  @Column(name = "lido_em", nullable = false)
  private Instant lidoEm;

  /** Exigido pelo JPA. */
  protected AvisoLido() {}

  public AvisoLido(Long usuarioId, String chave, Instant momento) {
    this.usuarioId = usuarioId;
    this.chave = chave;
    this.lidoEm = momento;
  }

  public String getChave() {
    return chave;
  }
}
