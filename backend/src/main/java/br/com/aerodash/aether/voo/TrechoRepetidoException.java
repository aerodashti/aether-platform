package br.com.aerodash.aether.voo;

import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
import org.springframework.http.HttpStatus;

/**
 * O mesmo trecho do mesmo Rel. Voo, na mesma aeronave, já foi lançado. Cada cópia contaria mais um
 * pouso e somaria as horas e os km de novo nos contadores que alimentam os limites de manutenção.
 */
public class TrechoRepetidoException extends ExcecaoDeDominio {

  private static final long serialVersionUID = 1L;

  public TrechoRepetidoException(String relatorioDeVoo, int numeroDoTrecho) {
    super(
        "Trecho repetido",
        "O trecho "
            + numeroDoTrecho
            + " do "
            + relatorioDeVoo
            + " já foi lançado nesta aeronave: corrija o lançamento existente.",
        "numeroDoTrecho");
  }

  @Override
  public HttpStatus getStatus() {
    return HttpStatus.CONFLICT;
  }
}
