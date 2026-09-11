package br.com.aerodash.aether.voo;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Locale;

/**
 * Uma perna voada. Trechos com o mesmo relatório de voo formam o voo completo — todas as pernas
 * voadas enquanto a aeronave esteve com o proprietário. Cada trecho conta um pouso e alimenta o
 * percentual de uso do rateio.
 */
@Entity
@Table(name = "trecho")
public class Trecho {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "aeronave_id", nullable = false)
  private Long aeronaveId;

  @Column(name = "relatorio_de_voo", nullable = false, length = 20)
  private String relatorioDeVoo;

  @Column(name = "numero_do_trecho", nullable = false)
  private int numeroDoTrecho;

  @Column(name = "data", nullable = false)
  private LocalDate data;

  @Column(name = "origem", nullable = false, length = 4)
  private String origem;

  @Column(name = "destino", nullable = false, length = 4)
  private String destino;

  @Column(name = "km", nullable = false, precision = 8, scale = 1)
  private BigDecimal km;

  @Column(name = "partida_prevista")
  private LocalTime partidaPrevista;

  @Column(name = "pouso_previsto")
  private LocalTime pousoPrevisto;

  @Column(name = "partida_realizada")
  private LocalTime partidaRealizada;

  @Column(name = "pouso_realizado")
  private LocalTime pousoRealizado;

  /** Nulo é voo de manutenção: o rateio divide entre todos os proprietários. */
  @Column(name = "proprietario_id")
  private Long proprietarioId;

  @Column(name = "observacoes", length = 500)
  private String observacoes;

  @Column(name = "criado_em", nullable = false)
  private Instant criadoEm;

  @Column(name = "atualizado_em", nullable = false)
  private Instant atualizadoEm;

  /** Exigido pelo JPA. */
  protected Trecho() {}

  public Trecho(Long aeronaveId, DadosDoTrecho dados, Instant momento) {
    this.aeronaveId = aeronaveId;
    this.criadoEm = momento;
    preencher(dados, momento);
  }

  public static String normalizarAerodromo(String codigo) {
    return codigo == null ? null : codigo.trim().toUpperCase(Locale.ROOT);
  }

  public void atualizar(DadosDoTrecho dados, Instant momento) {
    preencher(dados, momento);
  }

  private void preencher(DadosDoTrecho dados, Instant momento) {
    this.relatorioDeVoo = dados.relatorioDeVoo().trim();
    this.numeroDoTrecho = dados.numeroDoTrecho();
    this.data = dados.data();
    this.origem = normalizarAerodromo(dados.origem());
    this.destino = normalizarAerodromo(dados.destino());
    this.km = dados.km();
    this.partidaPrevista = dados.partidaPrevista();
    this.pousoPrevisto = dados.pousoPrevisto();
    this.partidaRealizada = dados.partidaRealizada();
    this.pousoRealizado = dados.pousoRealizado();
    this.proprietarioId = dados.proprietarioId();
    this.observacoes =
        dados.observacoes() == null || dados.observacoes().isBlank()
            ? null
            : dados.observacoes().trim();
    this.atualizadoEm = momento;
  }

  public boolean ehVooDeManutencao() {
    return proprietarioId == null;
  }

  /**
   * A duração em horas, com uma casa: o realizado quando o par está completo, senão o previsto.
   * Pouso antes da partida é virada de meia-noite, não voo negativo. Sem par completo não há
   * duração — nulo, e não zero: "não voou ainda" e "voo instantâneo" são afirmações diferentes.
   */
  public BigDecimal duracaoEmHoras() {
    LocalTime partida =
        partidaRealizada != null && pousoRealizado != null ? partidaRealizada : partidaPrevista;
    LocalTime pouso =
        partidaRealizada != null && pousoRealizado != null ? pousoRealizado : pousoPrevisto;
    if (partida == null || pouso == null) {
      return null;
    }
    Duration duracao = Duration.between(partida, pouso);
    if (duracao.isNegative() || duracao.isZero()) {
      duracao = duracao.plusHours(24);
    }
    return BigDecimal.valueOf(duracao.toMinutes())
        .divide(BigDecimal.valueOf(60), 1, RoundingMode.HALF_UP);
  }

  /** O que este trecho soma nos contadores da aeronave; horas nulas somam zero. */
  public BigDecimal horasParaContadores() {
    BigDecimal duracao = duracaoEmHoras();
    return duracao == null ? BigDecimal.ZERO : duracao;
  }

  public Long getId() {
    return id;
  }

  public Long getAeronaveId() {
    return aeronaveId;
  }

  public String getRelatorioDeVoo() {
    return relatorioDeVoo;
  }

  public int getNumeroDoTrecho() {
    return numeroDoTrecho;
  }

  public LocalDate getData() {
    return data;
  }

  public String getOrigem() {
    return origem;
  }

  public String getDestino() {
    return destino;
  }

  public BigDecimal getKm() {
    return km;
  }

  public LocalTime getPartidaPrevista() {
    return partidaPrevista;
  }

  public LocalTime getPousoPrevisto() {
    return pousoPrevisto;
  }

  public LocalTime getPartidaRealizada() {
    return partidaRealizada;
  }

  public LocalTime getPousoRealizado() {
    return pousoRealizado;
  }

  public Long getProprietarioId() {
    return proprietarioId;
  }

  public String getObservacoes() {
    return observacoes;
  }

  public Instant getCriadoEm() {
    return criadoEm;
  }

  public Instant getAtualizadoEm() {
    return atualizadoEm;
  }
}
