package br.com.aerodash.aether.voo;

import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
import org.springframework.http.HttpStatus;

/**
 * O trecho pedido não fecha: pouso antes da partida, atribuição a proprietário inativo. Toda recusa
 * nomeia o campo do request, para a tela marcá-lo em vez de mostrar a frase solta junto dos botões.
 */
public class VooInvalidoException extends ExcecaoDeDominio {

  private static final long serialVersionUID = 1L;

  public VooInvalidoException(String detalhe, String campo) {
    super("Trecho inválido", detalhe, campo);
  }

  @Override
  public HttpStatus getStatus() {
    return HttpStatus.BAD_REQUEST;
  }
}
