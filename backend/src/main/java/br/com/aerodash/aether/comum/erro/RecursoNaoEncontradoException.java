package br.com.aerodash.aether.comum.erro;

import org.springframework.http.HttpStatus;

/** Lançada quando um recurso identificado na requisição não existe. */
public class RecursoNaoEncontradoException extends ExcecaoDeDominio {

  private static final long serialVersionUID = 1L;

  public RecursoNaoEncontradoException(String detalhe) {
    super("Recurso não encontrado", detalhe);
  }

  @Override
  public HttpStatus getStatus() {
    return HttpStatus.NOT_FOUND;
  }
}
