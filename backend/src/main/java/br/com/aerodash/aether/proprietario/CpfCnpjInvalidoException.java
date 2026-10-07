package br.com.aerodash.aether.proprietario;

import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
import org.springframework.http.HttpStatus;

/** O documento não é um CPF nem um CNPJ: comprimento, caractere ou verificador errado. */
public class CpfCnpjInvalidoException extends ExcecaoDeDominio {

  private static final long serialVersionUID = 1L;

  public CpfCnpjInvalidoException() {
    super("CPF ou CNPJ inválido", CpfCnpj.MENSAGEM_DE_INVALIDO, "cpfCnpj");
  }

  @Override
  public HttpStatus getStatus() {
    return HttpStatus.BAD_REQUEST;
  }
}
