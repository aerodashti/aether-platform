package br.com.aerodash.aether.exemplo;

import br.com.aerodash.aether.saude.SituacaoDeSaude;

public final class ExemploUtil {

  private ExemploUtil() {}

  public static SituacaoDeSaude padrao() {
    return SituacaoDeSaude.OPERANTE;
  }
}
