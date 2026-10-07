package br.com.aerodash.aether.comum.erro;

import java.util.Optional;
import org.springframework.http.HttpStatus;

/**
 * Raiz das exceções de negócio do Aether. Toda subclasse carrega o título e o status HTTP que o
 * {@link TratadorGlobalDeErros} usa para montar o Problem Details (RFC 9457).
 *
 * <p>A recusa que é de um campo só — CPF inválido, matrícula já cadastrada, câmbio num lançamento
 * em BRL — diz qual, pelo nome do campo no JSON: o tratador o devolve em {@code campos}, e a tela
 * marca o campo certo em vez de mostrar a frase solta junto dos botões.
 */
public abstract class ExcecaoDeDominio extends RuntimeException {

  private static final long serialVersionUID = 1L;

  private final String titulo;
  private final String campo;

  protected ExcecaoDeDominio(String titulo, String detalhe) {
    this(titulo, detalhe, null);
  }

  protected ExcecaoDeDominio(String titulo, String detalhe, String campo) {
    super(detalhe);
    this.titulo = titulo;
    this.campo = campo;
  }

  public String getTitulo() {
    return titulo;
  }

  /** O campo do request a que a recusa se refere, quando é um só. */
  public Optional<String> getCampo() {
    return Optional.ofNullable(campo);
  }

  public abstract HttpStatus getStatus();
}
