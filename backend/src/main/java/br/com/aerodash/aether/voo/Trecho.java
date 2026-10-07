package br.com.aerodash.aether.voo;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Locale;
import java.util.Objects;
import java.util.stream.Stream;

/**
 * Uma perna voada. Trechos com o mesmo relatório de voo formam o voo completo — todas as pernas
 * voadas enquanto a aeronave esteve com o proprietário. Cada trecho conta um pouso e alimenta o
 * percentual de uso do rateio.
 */
@Entity
@Table(name = "trecho")
public class Trecho {

  /** A primeira data aceita para um trecho realizado (decisão de produto D1). */
  private static final LocalDate PRIMEIRA_DATA = LocalDate.of(2000, 1, 1);

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

  /**
   * O Rel. Voo agrupa os trechos por igualdade: "rv-2026-041" e "RV-2026-041" são o mesmo voo, no
   * diário, na conferência de duplicidade e no casamento com o custo (decisão de produto D19).
   */
  public static String normalizarRelatorio(String relatorioDeVoo) {
    return relatorioDeVoo == null ? null : relatorioDeVoo.trim().toUpperCase(Locale.ROOT);
  }

  public void atualizar(DadosDoTrecho dados, Instant momento) {
    preencher(dados, momento);
  }

  private void preencher(DadosDoTrecho dados, Instant momento) {
    this.relatorioDeVoo = normalizarRelatorio(dados.relatorioDeVoo());
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

  public ParDeHorarios previsto() {
    return new ParDeHorarios(partidaPrevista, pousoPrevisto);
  }

  public ParDeHorarios realizado() {
    return new ParDeHorarios(partidaRealizada, pousoRealizado);
  }

  /** Realizado é o trecho com o par de horários realizados: só ele move os contadores. */
  public boolean estaRealizado() {
    return realizado().estaCompleto();
  }

  /**
   * Horário realizado é fato: nenhum fica depois do {@code limite} — agora, com a folga do relógio
   * de bordo (decisão de produto D1).
   */
  public boolean possuiRealizadoAte(Instant limite) {
    return Stream.of(partidaRealizada, pousoRealizado)
        .filter(Objects::nonNull)
        .noneMatch(horario -> horario.isAfter(limite));
  }

  /**
   * As datas que este trecho aceita. O realizado é fato: de 2000 até hoje (D1). O planejado vai de
   * um ano para trás — o registro tardio — a dez anos à frente (D2).
   */
  public JanelaDeDatas janelaDaData(LocalDate hoje) {
    return estaRealizado()
        ? new JanelaDeDatas(PRIMEIRA_DATA, hoje)
        : new JanelaDeDatas(hoje.minusYears(1), hoje.plusYears(10));
  }

  /**
   * A duração em horas, com uma casa: o realizado quando o par está completo, senão o previsto. Sem
   * par completo não há duração — nulo, e não zero: "não voou ainda" e "voo instantâneo" são
   * afirmações diferentes.
   */
  public BigDecimal duracaoEmHoras() {
    return estaRealizado() ? realizado().horas() : previsto().horas();
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
    return estaRealizado() ? realizado().horas() : BigDecimal.ZERO;
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

  /** Um intervalo fechado de datas. */
  public record JanelaDeDatas(LocalDate minimo, LocalDate maximo) {

    public boolean contem(LocalDate data) {
      return !data.isBefore(minimo) && !data.isAfter(maximo);
    }
  }
}
