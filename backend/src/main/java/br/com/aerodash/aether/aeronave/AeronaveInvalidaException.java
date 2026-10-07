package br.com.aerodash.aether.aeronave;

import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
import org.springframework.http.HttpStatus;

/**
 * Um dado que o request aceitou campo a campo, mas a aeronave não: o CVA além da validade, o peso
 * de pouso acima do de decolagem, o motor que falta na sequência. A recusa é sempre de um campo só,
 * e a tela o marca.
 */
public class AeronaveInvalidaException extends ExcecaoDeDominio {

  private static final long serialVersionUID = 1L;

  public AeronaveInvalidaException(String detalhe, String campo) {
    super("Dados da aeronave inválidos", detalhe, campo);
  }

  @Override
  public HttpStatus getStatus() {
    return HttpStatus.BAD_REQUEST;
  }
}
