package br.com.aerodash.aether.proprietario;

import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
import org.springframework.http.HttpStatus;

/** O documento, depois de tirar a pontuação, não tem 11 nem 14 dígitos. */
public class CpfCnpjInvalidoException extends ExcecaoDeDominio {

  private static final long serialVersionUID = 1L;

  public CpfCnpjInvalidoException() {
    super("CPF ou CNPJ inválido", "O documento precisa ter 11 dígitos (CPF) ou 14 (CNPJ).");
  }

  @Override
  public HttpStatus getStatus() {
    return HttpStatus.BAD_REQUEST;
  }
}
