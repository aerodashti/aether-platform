package br.com.aerodash.aether.aeronave;

/**
 * Os campos editáveis da ficha técnica, juntos: eles só andam juntos. A matrícula fica de fora: é
 * identidade.
 *
 * <p>Texto opcional sem conteúdo é ausência. {@code ""} e {@code " "} viram nulo, para a ficha
 * mostrar o travessão em vez de uma linha em branco — e o modelo perde os espaços das pontas.
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

  public FichaTecnica {
    fabricante = textoOuNulo(fabricante);
    modelo = Aeronave.normalizarModelo(modelo);
    numeroDeSerie = textoOuNulo(numeroDeSerie);
    base = Aeronave.normalizarBase(base);
    hangar = textoOuNulo(hangar);
    apoliceDoSeguro = textoOuNulo(apoliceDoSeguro);
  }

  /** O peso de pouso nunca passa do de decolagem: a aeronave não ganha massa no ar. */
  public boolean possuiPesosCoerentes() {
    return pesoMaxDecolagemKg == null
        || pesoMaxPousoKg == null
        || pesoMaxPousoKg <= pesoMaxDecolagemKg;
  }

  private static String textoOuNulo(String texto) {
    return texto == null || texto.isBlank() ? null : texto.trim();
  }
}
