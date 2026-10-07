package br.com.aerodash.aether.aeronave;

/**
 * Os campos editáveis da ficha técnica, juntos: eles só andam juntos. A matrícula fica de fora: é
 * identidade. O cadastro e a edição da ficha passam pelo mesmo record e pelas mesmas regras.
 *
 * <p>Chegam normalizados: espaços nas pontas não fazem parte de nenhum dado, e o opcional em branco
 * é "não informado" (nulo) — gravado como texto vazio, o cartão mostraria uma linha em branco em
 * vez do travessão.
 */
public record FichaTecnica(
    String fabricante,
    String modelo,
    String numeroDeSerie,
    String base,
    String hangar,
    String apoliceDoSeguro,
    Integer pesoMaxDecolagemKg,
    Integer pesoMaxPousoKg) {

  /** Teto de plausibilidade dos pesos: o maior avião em operação não chega a 600 toneladas. */
  public static final int PESO_MAXIMO_KG = 600_000;

  public FichaTecnica {
    fabricante = textoOuNulo(fabricante);
    modelo = Aeronave.normalizarModelo(modelo);
    numeroDeSerie = textoOuNulo(numeroDeSerie);
    base = Aeronave.normalizarBase(base);
    hangar = textoOuNulo(hangar);
    apoliceDoSeguro = textoOuNulo(apoliceDoSeguro);
  }

  /** O MLW nunca passa do MTOW: a aeronave não pousa mais pesada do que decolou. */
  public boolean possuiPesosCoerentes() {
    return pesoMaxDecolagemKg == null
        || pesoMaxPousoKg == null
        || pesoMaxPousoKg <= pesoMaxDecolagemKg;
  }

  private static String textoOuNulo(String texto) {
    return texto == null || texto.isBlank() ? null : texto.trim();
  }
}
