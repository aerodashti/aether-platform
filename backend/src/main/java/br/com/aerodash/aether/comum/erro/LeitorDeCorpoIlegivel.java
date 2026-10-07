package br.com.aerodash.aether.comum.erro;

import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.JsonMappingException.Reference;
import com.fasterxml.jackson.databind.exc.MismatchedInputException;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Diz qual campo de um corpo JSON não pôde ser convertido, e no formato de quem o preenche.
 *
 * <p>"O corpo da requisição não pôde ser lido" não ajuda ninguém: uma data em 31/12/2026, uma
 * categoria que não existe ou "1.000,00" num campo numérico são erros de um campo só, e o Jackson
 * sabe qual — está no caminho da exceção. Aqui esse caminho vira o nome do campo no JSON ({@code
 * participacoes[0].percentual}) e o tipo esperado vira a instrução.
 */
final class LeitorDeCorpoIlegivel {

  private static final Set<Class<?>> INTEIROS =
      Set.of(Integer.class, int.class, Long.class, long.class, Short.class, short.class);
  private static final Set<Class<?>> DECIMAIS =
      Set.of(BigDecimal.class, Double.class, double.class, Float.class, float.class);

  private LeitorDeCorpoIlegivel() {}

  /**
   * O campo recusado e a instrução, ou vazio se o JSON nem chegou a ser lido. A exceção do Jackson
   * fica no meio da cadeia — a causa mais funda é a do conversor ({@code DateTimeParseException}),
   * que não sabe de campo nenhum.
   */
  static Map<String, String> camposRecusados(Throwable excecao) {
    for (Throwable causa = excecao; causa != null; causa = causa.getCause()) {
      if (causa instanceof JsonMappingException mapeamento && !mapeamento.getPath().isEmpty()) {
        return Map.of(caminho(mapeamento.getPath()), instrucao(mapeamento));
      }
    }
    return Map.of();
  }

  private static String caminho(List<Reference> referencias) {
    StringBuilder caminho = new StringBuilder();
    for (Reference referencia : referencias) {
      if (referencia.getFieldName() != null) {
        caminho.append(caminho.isEmpty() ? "" : ".").append(referencia.getFieldName());
      } else {
        caminho.append('[').append(referencia.getIndex()).append(']');
      }
    }
    return caminho.toString();
  }

  private static String instrucao(JsonMappingException mapeamento) {
    Class<?> alvo =
        mapeamento instanceof MismatchedInputException desencontro
            ? desencontro.getTargetType()
            : null;
    if (alvo == null) {
      return "Valor em formato inválido.";
    }
    if (alvo.isEnum()) {
      return "Escolha uma das opções da lista.";
    }
    if (INTEIROS.contains(alvo)) {
      return "Informe um número inteiro.";
    }
    if (DECIMAIS.contains(alvo)) {
      return "Informe um número, com ponto para as casas decimais.";
    }
    return instrucaoDeTempo(alvo);
  }

  private static String instrucaoDeTempo(Class<?> alvo) {
    if (alvo == LocalDate.class) {
      return "Informe uma data que exista, no formato AAAA-MM-DD.";
    }
    if (alvo == YearMonth.class) {
      return "Informe a competência no formato AAAA-MM.";
    }
    if (alvo == OffsetDateTime.class || alvo == Instant.class) {
      return "Informe data e hora com o fuso, no formato AAAA-MM-DDThh:mm-03:00.";
    }
    if (alvo == LocalTime.class) {
      return "Informe a hora no formato hh:mm.";
    }
    return "Valor em formato inválido.";
  }
}
