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
  private Instant partidaPrevista;

  @Column(name = "pouso_previsto")
  private Instant pousoPrevisto;

  @Column(name = "partida_realizada")
  private Instant partidaRealizada;

  @Column(name = "pouso_realizado")
  private Instant pousoRealizado;

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

  /** Realizado é o trecho com o par de horários realizados: só ele move os contadores. */
  public boolean estaRealizado() {
    return partidaRealizada != null && pousoRealizado != null;
  }

  /**
   * Os horários são instantes: o pouso tem que vir depois da partida, em cada par. Antes deles
   * serem instantes, 10:00 depois de 10:45 virava um voo de 23 horas.
   */
  public static boolean possuiHorariosCoerentes(DadosDoTrecho dados) {
    return pousoDepoisDaPartida(dados.partidaPrevista(), dados.pousoPrevisto())
        && pousoDepoisDaPartida(dados.partidaRealizada(), dados.pousoRealizado());
  }

  private static boolean pousoDepoisDaPartida(Instant partida, Instant pouso) {
    return partida == null || pouso == null || pouso.isAfter(partida);
  }

  /**
   * A duração em horas, com uma casa: o realizado quando o par está completo, senão o previsto. Sem
   * par completo não há duração — nulo, e não zero: "não voou ainda" e "voo instantâneo" são
   * afirmações diferentes.
   */
  public BigDecimal duracaoEmHoras() {
    return estaRealizado()
        ? horasEntre(partidaRealizada, pousoRealizado)
        : horasEntre(partidaPrevista, pousoPrevisto);
  }

  private static BigDecimal horasEntre(Instant partida, Instant pouso) {
    if (partida == null || pouso == null) {
      return null;
    }
    return BigDecimal.valueOf(Duration.between(partida, pouso).toMinutes())
        .divide(BigDecimal.valueOf(60), 1, RoundingMode.HALF_UP);
  }

  /**
   * O que o trecho pesa no % de uso do rateio: o realizado, senão o previsto — o voo de ontem ainda
   * sem os horários fechados já é uso. Sem duração, zero.
   */
  public BigDecimal horasParaRateio() {
    BigDecimal duracao = duracaoEmHoras();
    return duracao == null ? BigDecimal.ZERO : duracao;
  }

  /**
   * O que o trecho soma nos contadores da aeronave: só o realizado. Trecho planejado não gastou
   * célula, ciclo nem quilômetro (decisão de produto, 2026-10-07).
   */
  public BigDecimal horasParaContadores() {
    return estaRealizado() ? horasEntre(partidaRealizada, pousoRealizado) : BigDecimal.ZERO;
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

  public Instant getPartidaPrevista() {
    return partidaPrevista;
  }

  public Instant getPousoPrevisto() {
    return pousoPrevisto;
  }

  public Instant getPartidaRealizada() {
    return partidaRealizada;
  }

  public Instant getPousoRealizado() {
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
