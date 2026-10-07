package br.com.aerodash.aether.manutencao;

import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
import org.springframework.http.HttpStatus;

/**
 * Já existe um parâmetro com este nome na aeronave, sem diferença de maiúsculas: a tabela e a
 * Central de avisos ("Limite estourado: …") não teriam como dizer qual dos dois é.
 */
public class ParametroDuplicadoException extends ExcecaoDeDominio {

  private static final long serialVersionUID = 1L;

  public ParametroDuplicadoException() {
    super(
        "Parâmetro já cadastrado", "Já existe um parâmetro com este nome nesta aeronave.", "nome");
  }

  @Override
  public HttpStatus getStatus() {
    return HttpStatus.CONFLICT;
  }
}
