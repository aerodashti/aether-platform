package br.com.aerodash.aether.empresa;

import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
import org.springframework.http.HttpStatus;

/** A antecedência pedida está fora da faixa que faz sentido como aviso. */
public class AvisoDeVencimentoInvalidoException extends ExcecaoDeDominio {

  private static final long serialVersionUID = 1L;

  public AvisoDeVencimentoInvalidoException(int minimo, int maximo) {
    super(
        "Antecedência inválida",
        "O aviso deve ser de %d a %d dias antes do vencimento.".formatted(minimo, maximo));
  }

  @Override
  public HttpStatus getStatus() {
    return HttpStatus.BAD_REQUEST;
  }
}
