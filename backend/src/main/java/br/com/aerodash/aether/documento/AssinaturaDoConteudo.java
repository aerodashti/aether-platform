package br.com.aerodash.aether.documento;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;

/**
 * O "número mágico" de um formato: os bytes que todo arquivo dele traz no começo. A extensão diz o
 * que o arquivo deveria ser; a assinatura confere se é — um HTML renomeado para ".pdf" não entra no
 * acervo como se fosse a apólice.
 */
@FunctionalInterface
interface AssinaturaDoConteudo {

  /** Quanto do começo do arquivo se lê: o PDF pode trazer o cabeçalho até o byte 1024. */
  int BYTES_LIDOS = 1024;

  /** Texto (CSV, TXT) não tem assinatura: qualquer começo serve. */
  AssinaturaDoConteudo QUALQUER = inicio -> true;

  /** O PDF admite lixo antes do cabeçalho, e os leitores o procuram no começo todo. */
  AssinaturaDoConteudo PDF = contem("%PDF-");

  AssinaturaDoConteudo PNG = comecaCom(0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A);

  AssinaturaDoConteudo JPEG = comecaCom(0xFF, 0xD8, 0xFF);

  AssinaturaDoConteudo WEBP = naPosicao(0, "RIFF").e(naPosicao(8, "WEBP"));

  /** HEIC é uma caixa ISO BMFF: "ftyp" depois do tamanho, com marcas que variam por aparelho. */
  AssinaturaDoConteudo HEIC = naPosicao(4, "ftyp");

  /** DOCX e XLSX são pacotes ZIP. */
  AssinaturaDoConteudo ZIP = comecaCom('P', 'K', 0x03, 0x04);

  /** DOC e XLS do Office 97–2003: o contêiner OLE2. */
  AssinaturaDoConteudo OLE2 = comecaCom(0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1);

  /** O Word também salva RTF com a extensão .doc, e ele abre. */
  AssinaturaDoConteudo RTF = naPosicao(0, "{\\rtf");

  boolean reconhece(byte[] inicio);

  default AssinaturaDoConteudo e(AssinaturaDoConteudo outra) {
    return inicio -> reconhece(inicio) && outra.reconhece(inicio);
  }

  default AssinaturaDoConteudo ou(AssinaturaDoConteudo outra) {
    return inicio -> reconhece(inicio) || outra.reconhece(inicio);
  }

  static AssinaturaDoConteudo comecaCom(int... bytes) {
    return naPosicao(0, bytes);
  }

  static AssinaturaDoConteudo naPosicao(int posicao, String ascii) {
    return naPosicao(posicao, ascii.chars().toArray());
  }

  static AssinaturaDoConteudo naPosicao(int posicao, int... bytes) {
    return inicio -> {
      if (inicio.length < posicao + bytes.length) {
        return false;
      }
      for (int i = 0; i < bytes.length; i++) {
        if ((inicio[posicao + i] & 0xFF) != bytes[i]) {
          return false;
        }
      }
      return true;
    };
  }

  /** Em qualquer ponto do começo lido. */
  static AssinaturaDoConteudo contem(String ascii) {
    byte[] procurado = ascii.getBytes(StandardCharsets.US_ASCII);
    return inicio -> {
      for (int i = 0; i + procurado.length <= inicio.length; i++) {
        if (Arrays.equals(inicio, i, i + procurado.length, procurado, 0, procurado.length)) {
          return true;
        }
      }
      return false;
    };
  }
}
