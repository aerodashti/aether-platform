package br.com.aerodash.aether.proprietario;

import java.util.Locale;
import java.util.regex.Pattern;

/**
 * As regras do documento do proprietário: CPF (11 dígitos) ou CNPJ (14 caracteres).
 *
 * <p>Desde julho de 2026 a Receita emite CNPJ alfanumérico (IN RFB 2.229/2024): os 12 primeiros
 * caracteres podem ter letras, e os dois verificadores continuam números. A conta do módulo 11 é a
 * mesma, com cada caractere valendo o código ASCII menos 48 — "0" a "9" valem 0 a 9, "A" vale 17.
 *
 * <p>Moram juntas aqui, e não espalhadas pela entidade, para que a entidade, o service e a
 * validação do request usem a mesma régua.
 */
final class CpfCnpj {

  static final String MENSAGEM_DE_INVALIDO =
      "Confira o documento: o CPF tem 11 números; o CNPJ, 14 caracteres (letras só nos 12"
          + " primeiros). Os dígitos verificadores precisam bater.";

  private static final Pattern EM_BRANCO = Pattern.compile("[\\s\\p{Z}]*");
  private static final Pattern PONTUACAO = Pattern.compile("[.\\-/\\s\\p{Z}]");
  private static final Pattern FORMATO_DO_CPF = Pattern.compile("[0-9]{11}");
  private static final Pattern FORMATO_DO_CNPJ = Pattern.compile("[0-9A-Z]{12}[0-9]{2}");
  private static final int TAMANHO_DO_CPF = 11;
  private static final int[] PESOS_DO_CPF = {11, 10, 9, 8, 7, 6, 5, 4, 3, 2};
  private static final int[] PESOS_DO_CNPJ = {6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2};

  private CpfCnpj() {}

  /**
   * O documento sem pontuação e em maiúsculas: "123.456.789-09" e "12345678909" são a mesma pessoa,
   * e a unicidade do banco só funciona se a forma for uma. Só o campo em branco é ausência — texto
   * que não é documento continua aqui, para {@link #ehValido} recusá-lo em vez de virar "sem
   * documento" em silêncio.
   */
  static String normalizar(String texto) {
    if (texto == null || EM_BRANCO.matcher(texto).matches()) {
      return null;
    }
    return PONTUACAO.matcher(texto).replaceAll("").toUpperCase(Locale.ROOT);
  }

  /**
   * Os dois verificadores conferem: é o documento do titular no RAB, e um caractere trocado na
   * digitação vira outra pessoa. A sequência repetida passa na conta, mas não é emitida. A ausência
   * é válida — o documento é opcional no cadastro.
   */
  static boolean ehValido(String normalizado) {
    if (normalizado == null) {
      return true;
    }
    boolean formatoConhecido =
        FORMATO_DO_CPF.matcher(normalizado).matches()
            || FORMATO_DO_CNPJ.matcher(normalizado).matches();
    if (!formatoConhecido || normalizado.chars().distinct().count() == 1) {
      return false;
    }
    int tamanho = normalizado.length();
    int[] pesos = tamanho == TAMANHO_DO_CPF ? PESOS_DO_CPF : PESOS_DO_CNPJ;
    return verificadorConfere(normalizado, tamanho - 2, pesos)
        && verificadorConfere(normalizado, tamanho - 1, pesos);
  }

  /** Módulo 11 sobre os caracteres antes da `posicao`, com os pesos alinhados à direita. */
  private static boolean verificadorConfere(String documento, int posicao, int[] pesos) {
    int soma = 0;
    int deslocamento = pesos.length - posicao;
    for (int i = 0; i < posicao; i++) {
      soma += valor(documento.charAt(i)) * pesos[deslocamento + i];
    }
    int resto = soma % 11;
    int esperado = resto < 2 ? 0 : 11 - resto;
    return valor(documento.charAt(posicao)) == esperado;
  }

  private static int valor(char caractere) {
    return caractere - '0';
  }
}
