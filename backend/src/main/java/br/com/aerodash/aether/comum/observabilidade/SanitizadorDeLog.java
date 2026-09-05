package br.com.aerodash.aether.comum.observabilidade;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

/**
 * Prepara qualquer valor antes de ele chegar ao log ou ao span.
 *
 * <p>São duas responsabilidades distintas. Sigilo: os campos listados em {@link
 * PoliticaDeCamposSensiveis} são mascarados, o resto aparece em claro. Tamanho: texto longo é
 * truncado, lista grande é resumida e a recursão para em uma profundidade fixa — assim nenhum corpo
 * de request consegue inundar a linha canônica.
 */
@Component
public class SanitizadorDeLog {

  static final int LIMITE_DE_TEXTO = 500;
  static final int ITENS_DA_LISTA = 5;
  static final int PROFUNDIDADE_MAXIMA = 6;

  private static final String CHAVE_TOTAL = "_total";
  private static final String CHAVE_ITENS = "itens";

  private final PoliticaDeCamposSensiveis politica;
  private final ObjectMapper json;

  public SanitizadorDeLog(PoliticaDeCamposSensiveis politica, ObjectMapper json) {
    this.politica = politica;
    this.json = json;
  }

  /**
   * Trata um corpo bruto de request ou response. Conteúdo que não é JSON — multipart, binário,
   * arquivo — nunca é lido: registra-se apenas o tipo e o tamanho.
   */
  public Object sanitizarCorpo(byte[] corpo, String contentType) {
    if (corpo == null || corpo.length == 0) {
      return null;
    }
    if (contentType == null || !contentType.toLowerCase(java.util.Locale.ROOT).contains("json")) {
      return descrever(corpo, contentType);
    }
    try {
      return sanitizar(json.readValue(corpo, Object.class));
    } catch (java.io.IOException naoEhJsonValido) {
      return descrever(corpo, contentType);
    }
  }

  public Object sanitizar(Object valor) {
    return sanitizar(valor, 0);
  }

  private static Map<String, Object> descrever(byte[] corpo, String contentType) {
    Map<String, Object> descricao = new LinkedHashMap<>();
    descricao.put("content_type", contentType == null ? "desconhecido" : contentType);
    descricao.put("tamanho_bytes", corpo.length);
    return descricao;
  }

  private Object sanitizar(Object valor, int profundidade) {
    if (profundidade > PROFUNDIDADE_MAXIMA) {
      return "…[profundidade máxima]";
    }
    return switch (valor) {
      case null -> null;
      case Map<?, ?> mapa -> sanitizarMapa(mapa, profundidade);
      case Collection<?> colecao -> sanitizarLista(colecao, profundidade);
      case String texto -> truncar(texto);
      case Number numero -> numero;
      case Boolean logico -> logico;
      case Enum<?> constante -> constante.name();
      default -> sanitizarObjeto(valor, profundidade);
    };
  }

  private Object sanitizarMapa(Map<?, ?> mapa, int profundidade) {
    Map<String, Object> tratado = new LinkedHashMap<>();
    for (Map.Entry<?, ?> entrada : mapa.entrySet()) {
      String campo = String.valueOf(entrada.getKey());
      tratado.put(
          campo,
          politica.ehSensivel(campo)
              ? politica.mascarar(campo, entrada.getValue())
              : sanitizar(entrada.getValue(), profundidade + 1));
    }
    return tratado;
  }

  private Object sanitizarLista(Collection<?> colecao, int profundidade) {
    List<Object> primeiros = new ArrayList<>();
    for (Object item : colecao) {
      if (primeiros.size() == ITENS_DA_LISTA) {
        break;
      }
      primeiros.add(sanitizar(item, profundidade + 1));
    }
    if (colecao.size() <= ITENS_DA_LISTA) {
      return primeiros;
    }
    Map<String, Object> resumo = new LinkedHashMap<>();
    resumo.put(CHAVE_ITENS, primeiros);
    resumo.put(CHAVE_TOTAL, colecao.size());
    return resumo;
  }

  private static String truncar(String texto) {
    if (texto.length() <= LIMITE_DE_TEXTO) {
      return texto;
    }
    return texto.substring(0, LIMITE_DE_TEXTO) + "…[truncado, " + texto.length() + " chars]";
  }

  /** Objeto de domínio: vira mapa para cair na mesma regra de allowlist dos corpos JSON. */
  private Object sanitizarObjeto(Object valor, int profundidade) {
    try {
      return sanitizar(json.convertValue(valor, Map.class), profundidade);
    } catch (IllegalArgumentException naoEhConversivel) {
      return truncar(String.valueOf(valor));
    }
  }
}
