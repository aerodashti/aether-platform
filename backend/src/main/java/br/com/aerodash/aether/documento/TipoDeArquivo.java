package br.com.aerodash.aether.documento;

import java.util.Arrays;
import java.util.Locale;
import java.util.Optional;

/**
 * Os tipos que a aeronave guarda: documento escaneado, foto, planilha, texto. Fechado de propósito
 * — HTML, SVG e executáveis não entram — e o tipo de conteúdo servido no download vem daqui, da
 * extensão, nunca do que o navegador declarou no envio.
 */
public enum TipoDeArquivo {
  PDF("pdf", "application/pdf"),
  PNG("png", "image/png"),
  JPG("jpg", "image/jpeg"),
  JPEG("jpeg", "image/jpeg"),
  WEBP("webp", "image/webp"),
  HEIC("heic", "image/heic"),
  DOC("doc", "application/msword"),
  DOCX("docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
  XLS("xls", "application/vnd.ms-excel"),
  XLSX("xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
  CSV("csv", "text/csv"),
  TXT("txt", "text/plain");

  private final String extensao;
  private final String tipoDeConteudo;

  TipoDeArquivo(String extensao, String tipoDeConteudo) {
    this.extensao = extensao;
    this.tipoDeConteudo = tipoDeConteudo;
  }

  public static Optional<TipoDeArquivo> doNome(String nome) {
    int ponto = nome.lastIndexOf('.');
    if (ponto < 0 || ponto == nome.length() - 1) {
      return Optional.empty();
    }
    String extensao = nome.substring(ponto + 1).toLowerCase(Locale.ROOT);
    return Arrays.stream(values()).filter(tipo -> tipo.extensao.equals(extensao)).findFirst();
  }

  public static String aceitos() {
    return String.join(
        ", ", Arrays.stream(values()).map(tipo -> tipo.extensao.toUpperCase(Locale.ROOT)).toList());
  }

  public String getTipoDeConteudo() {
    return tipoDeConteudo;
  }
}
