package br.com.aerodash.aether.aeronave;

import java.time.LocalDate;
import java.time.Period;

/**
 * Documento regulatório com vencimento próprio.
 *
 * <p>Siglas oficiais não são traduzidas nem abreviadas de outro jeito — veja {@code
 * docs/glossario.md}. Os dois de hoje são os que decidem se a aeronave voa; certificado de ruído,
 * licença de estação e afins entram com a tela de Documentos.
 */
public enum DocumentoDaAeronave {

  /**
   * Certificado de Verificação de Aeronavegabilidade. Vale 12 meses no RBAC 91; o mês a mais é a
   * tolerância de quem renova antes do vencimento.
   */
  CVA(Period.ofMonths(13)),

  /** Seguro obrigatório de Responsabilidade do Explorador ou Transportador Aéreo. */
  RETA(Period.ofYears(5));

  /**
   * Antes disso, o vencimento é ano digitado errado: frota nenhuma chega com histórico tão velho.
   */
  private static final LocalDate PRIMEIRO_VENCIMENTO_ACEITO = LocalDate.of(2000, 1, 1);

  /** O vencimento mais distante que um documento novo pode ter, contado de hoje. */
  private final Period validadeMaxima;

  DocumentoDaAeronave(Period validadeMaxima) {
    this.validadeMaxima = validadeMaxima;
  }

  /**
   * Vencido é aceito — a aeronave entra como Vencido, e é isso que a frota precisa mostrar. O que
   * se recusa é o implausível: antes de 2000, ou além da validade máxima do documento.
   */
  public boolean aceitaVencimento(LocalDate vencimento, LocalDate hoje) {
    return !vencimento.isBefore(PRIMEIRO_VENCIMENTO_ACEITO)
        && !vencimento.isAfter(hoje.plus(validadeMaxima));
  }
}
