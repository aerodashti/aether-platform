package br.com.aerodash.aether.aeronave;

import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
import org.springframework.http.HttpStatus;

/** Já existe uma aeronave com esta matrícula — quase sempre um recadastro por engano. */
public class MatriculaJaCadastradaException extends ExcecaoDeDominio {

  private static final long serialVersionUID = 1L;

  public MatriculaJaCadastradaException() {
    super("Matrícula já cadastrada", "Já existe uma aeronave com esta matrícula na frota.");
  }

  @Override
  public HttpStatus getStatus() {
    return HttpStatus.CONFLICT;
  }
}
