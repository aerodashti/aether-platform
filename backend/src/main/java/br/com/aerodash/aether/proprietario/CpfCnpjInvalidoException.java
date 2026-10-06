package br.com.aerodash.aether.proprietario;

import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
import org.springframework.http.HttpStatus;

/** O documento, depois de tirar a pontuação, não tem 11 nem 14 dígitos. */
public class CpfCnpjInvalidoException extends ExcecaoDeDominio {

  private static final long serialVersionUID = 1L;

  public CpfCnpjInvalidoException() {
    super(
        "CPF ou CNPJ inválido",
        "Confira o documento: um CPF tem 11 dígitos, um CNPJ 14, e os dígitos verificadores precisam bater.");
  }

  @Override
  public HttpStatus getStatus() {
    return HttpStatus.BAD_REQUEST;
  }
}
