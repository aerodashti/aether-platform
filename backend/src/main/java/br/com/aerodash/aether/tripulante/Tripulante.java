package br.com.aerodash.aether.tripulante;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Locale;

/**
 * Piloto vinculado a uma aeronave, com as validades que decidem se pode voar.
 *
 * <p>O CMA e o CHT vencem como os documentos da aeronave vencem: a mesma pergunta ("quantos dias
 * faltam?") com a mesma resposta em dias negativos quando já passou. Validade nula significa "não
 * informada" — e a tela mostra o travessão, não um alarme.
 */
@Entity
@Table(name = "tripulante")
public class Tripulante {

  /** A validade mais antiga que se cadastra: antes disso é ano digitado errado, não histórico. */
  public static final LocalDate PRIMEIRA_VALIDADE = LocalDate.of(2000, 1, 1);

  /** CMA e CHT valem poucos anos: uma validade em 2062 é erro de digitação, não documento. */
  private static final int ANOS_DE_VALIDADE_A_FRENTE = 5;

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "aeronave_id", nullable = false)
  private Long aeronaveId;

  @Column(name = "nome", nullable = false, length = 120)
  private String nome;

  @Column(name = "canac", length = 10)
  private String canac;

  @Enumerated(EnumType.STRING)
  @Column(name = "funcao", nullable = false, length = 12)
  private FuncaoDoTripulante funcao;

  @Column(name = "validade_cma")
  private LocalDate validadeCma;

  @Column(name = "validade_cht")
  private LocalDate validadeCht;

  @Column(name = "horas_totais", precision = 10, scale = 1)
  private BigDecimal horasTotais;

  @Column(name = "telefone", length = 20)
  private String telefone;

  @Column(name = "email", length = 180)
  private String email;

  @Enumerated(EnumType.STRING)
  @Column(name = "situacao", nullable = false, length = 10)
  private SituacaoDoTripulante situacao;

  @Column(name = "criado_em", nullable = false)
  private Instant criadoEm;

  @Column(name = "atualizado_em", nullable = false)
  private Instant atualizadoEm;

  /** Exigido pelo JPA. */
  protected Tripulante() {}

  public Tripulante(Long aeronaveId, DadosDoTripulante dados, Instant momento) {
    this.aeronaveId = aeronaveId;
    this.criadoEm = momento;
    preencher(dados, momento);
  }

  /** O CANAC é gravado só com dígitos: máscara é redação de tela. Vazio vira nulo. */
  public static String normalizarCanac(String canac) {
    if (canac == null) {
      return null;
    }
    String digitos = canac.replaceAll("\\D", "");
    return digitos.isEmpty() ? null : digitos;
  }

  public static String normalizarEmail(String email) {
    if (email == null) {
      return null;
    }
    String limpo = email.trim().toLowerCase(Locale.ROOT);
    return limpo.isEmpty() ? null : limpo;
  }

  public static LocalDate ultimaValidade(LocalDate hoje) {
    return hoje.plusYears(ANOS_DE_VALIDADE_A_FRENTE);
  }

  /**
   * A validade de CMA ou CHT cabe na janela plausível. Já vencida é aceita — é um fato que a tela
   * avisa —, e nula também: é "não informada".
   */
  public static boolean aceitaValidade(LocalDate validade, LocalDate hoje) {
    return validade == null
        || (!validade.isBefore(PRIMEIRA_VALIDADE) && !validade.isAfter(ultimaValidade(hoje)));
  }

  public boolean estaAtivo() {
    return situacao == SituacaoDoTripulante.ATIVO;
  }

  /** Nulo não é vencido: é "não informado", e a tela distingue os dois. */
  public boolean possuiCmaVencido(LocalDate hoje) {
    return validadeCma != null && validadeCma.isBefore(hoje);
  }

  public boolean possuiChtVencido(LocalDate hoje) {
    return validadeCht != null && validadeCht.isBefore(hoje);
  }

  public void atualizar(DadosDoTripulante dados, Instant momento) {
    preencher(dados, momento);
  }

  private void preencher(DadosDoTripulante dados, Instant momento) {
    this.nome = dados.nome().trim();
    this.canac = normalizarCanac(dados.canac());
    this.funcao = dados.funcao();
    this.validadeCma = dados.validadeCma();
    this.validadeCht = dados.validadeCht();
    this.horasTotais = dados.horasTotais();
    this.telefone =
        dados.telefone() == null || dados.telefone().isBlank() ? null : dados.telefone().trim();
    this.email = normalizarEmail(dados.email());
    this.situacao = dados.situacao();
    this.atualizadoEm = momento;
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

  public String getCanac() {
    return canac;
  }

  public FuncaoDoTripulante getFuncao() {
    return funcao;
  }

  public LocalDate getValidadeCma() {
    return validadeCma;
  }

  public LocalDate getValidadeCht() {
    return validadeCht;
  }

  public BigDecimal getHorasTotais() {
    return horasTotais;
  }

  public String getTelefone() {
    return telefone;
  }

  public String getEmail() {
    return email;
  }

  public SituacaoDoTripulante getSituacao() {
    return situacao;
  }

  public Instant getCriadoEm() {
    return criadoEm;
  }

  public Instant getAtualizadoEm() {
    return atualizadoEm;
  }
}
