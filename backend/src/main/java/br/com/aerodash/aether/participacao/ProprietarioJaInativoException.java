package br.com.aerodash.aether.participacao;

import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
import org.springframework.http.HttpStatus;

/** A saída de quem já está inativo: não há contrato a redistribuir nem situação a mudar. */
public class ProprietarioJaInativoException extends ExcecaoDeDominio {

  private static final long serialVersionUID = 1L;

  public ProprietarioJaInativoException(String nome) {
    super(
        "Proprietário já inativo",
        "O cadastro de " + nome + " já está inativo: não há saída a registrar.");
  }

  @Override
  public HttpStatus getStatus() {
    return HttpStatus.CONFLICT;
  }
}
