package br.com.aerodash.aether.manutencao;

import java.util.regex.Pattern;

/**
 * Espaço nas pontas de um texto digitado, incluindo os que o {@code trim()} do Java não vê: o
 * espaço não separável (U+00A0) e os demais separadores Unicode. O {@code @NotBlank} também não os
 * vê, e um nome feito só deles seria gravado "em branco".
 */
final class Espacos {

  /** Para o {@code @Pattern} de um texto obrigatório: há algo além de espaço. */
  static final String ALGO_ALEM_DE_ESPACO = "(?s).*[^\\p{Z}\\s\\x{FEFF}].*";

  private static final Pattern NAS_PONTAS =
      Pattern.compile("^[\\p{Z}\\s\\x{FEFF}]+|[\\p{Z}\\s\\x{FEFF}]+$");

  private Espacos() {}

  static String aparar(String texto) {
    return NAS_PONTAS.matcher(texto).replaceAll("");
  }

  /** Opcional vazio, ou só de espaços, é ausência: nulo, nunca texto em branco. */
  static String apararOuNulo(String texto) {
    if (texto == null) {
      return null;
    }
    String aparado = aparar(texto);
    return aparado.isEmpty() ? null : aparado;
  }
}
