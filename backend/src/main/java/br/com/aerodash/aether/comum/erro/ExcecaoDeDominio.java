package br.com.aerodash.aether.comum.erro;

import org.springframework.http.HttpStatus;

/**
 * Raiz das exceções de negócio do Aether. Toda subclasse carrega o título e o status HTTP que o
 * {@link TratadorGlobalDeErros} usa para montar o Problem Details (RFC 9457).
 */
public abstract class ExcecaoDeDominio extends RuntimeException {

  private static final long serialVersionUID = 1L;

  private final String titulo;

  protected ExcecaoDeDominio(String titulo, String detalhe) {
    super(detalhe);
    this.titulo = titulo;
  }

  public String getTitulo() {
    return titulo;
  }

  public abstract HttpStatus getStatus();
}
