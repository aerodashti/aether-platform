package br.com.aerodash.aether.autenticacao;

import java.util.Locale;

/**
 * O que a pessoa digitou na busca de usuários, pronto para o {@code like}: sem acento, em
 * minúsculas, com os curingas escapados e com {@code %} dos dois lados.
 *
 * <p>Sem o escape, "_" ou "%" casam com todo mundo e "a_b" casa com "axb". Sem tirar o acento,
 * "patricia" não acha "Patrícia". A consulta tira os acentos do nome com o mesmo par de alfabetos
 * ({@link #COM_ACENTO} e {@link #SEM_ACENTO}), então os dois lados comparam a mesma grafia.
 */
final class TermoDeBusca {

  static final String COM_ACENTO = "áàâãäåéèêëíìîïóòôõöúùûüçñýÿÁÀÂÃÄÅÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑÝ";
  static final String SEM_ACENTO = "aaaaaaeeeeiiiiooooouuuucnyyAAAAAAEEEEIIIIOOOOOUUUUCNY";

  /** Escolhido por não aparecer em nome nem em e-mail comum; a consulta o declara no ESCAPE. */
  static final char ESCAPE = '!';

  /**
   * O trecho da consulta que compara o termo com o usuário {@code u}. O nome perde os acentos pelo
   * {@code translate} do PostgreSQL, que não exige extensão; o e-mail já é gravado em minúsculas.
   */
  static final String CONDICAO =
      " (lower(translate(u.nome, '"
          + COM_ACENTO
          + "', '"
          + SEM_ACENTO
          + "')) like :busca escape '"
          + ESCAPE
          + "' or u.email like :busca escape '"
          + ESCAPE
          + "')";

  /** Busca vazia vira {@code %}, que casa com tudo: a consulta tem uma forma só. */
  private static final String QUALQUER = "%";

  private TermoDeBusca() {}

  static String paraLike(String busca) {
    if (busca == null || busca.isBlank()) {
      return QUALQUER;
    }
    String normalizado = semAcento(busca.strip()).toLowerCase(Locale.ROOT);
    return QUALQUER + escaparCuringas(normalizado) + QUALQUER;
  }

  private static String semAcento(String texto) {
    StringBuilder resultado = new StringBuilder(texto.length());
    for (int indice = 0; indice < texto.length(); indice++) {
      char caractere = texto.charAt(indice);
      int posicao = COM_ACENTO.indexOf(caractere);
      resultado.append(posicao < 0 ? caractere : SEM_ACENTO.charAt(posicao));
    }
    return resultado.toString();
  }

  private static String escaparCuringas(String texto) {
    StringBuilder resultado = new StringBuilder(texto.length());
    for (int indice = 0; indice < texto.length(); indice++) {
      char caractere = texto.charAt(indice);
      if (caractere == ESCAPE || caractere == '%' || caractere == '_') {
        resultado.append(ESCAPE);
      }
      resultado.append(caractere);
    }
    return resultado.toString();
  }
}
