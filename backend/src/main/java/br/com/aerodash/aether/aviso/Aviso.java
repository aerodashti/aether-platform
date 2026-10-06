package br.com.aerodash.aether.aviso;

import java.time.LocalDate;
import java.util.Comparator;

/**
 * Um aviso derivado do estado da frota. Não é entidade: nasce a cada leitura e some quando a causa
 * some — renovado o seguro, o aviso do seguro deixa de existir.
 *
 * @param chave identidade estável, com o prazo dentro: renovar gera chave nova
 * @param prazo a data que vence ou venceu; nula quando o limite é de horas ou ciclos
 * @param destino a tela onde o aviso se resolve
 */
public record Aviso(
    String chave,
    CategoriaDoAviso categoria,
    GravidadeDoAviso gravidade,
    String titulo,
    String detalhe,
    Long aeronaveId,
    LocalDate prazo,
    String destino) {

  /** Vencido antes de próximo; dentro de cada um, o prazo mais curto primeiro. */
  public static final Comparator<Aviso> POR_URGENCIA =
      Comparator.comparing(Aviso::gravidade)
          .thenComparing(Aviso::prazo, Comparator.nullsLast(Comparator.naturalOrder()))
          .thenComparing(Aviso::chave);

  public boolean estaVencido() {
    return gravidade == GravidadeDoAviso.VENCIDO;
  }
}
