package br.com.aerodash.aether.documento;

import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
import org.springframework.http.HttpStatus;

/** O arquivo não entra: tipo fora da lista, vazio ou grande demais. */
public class DocumentoInvalidoException extends ExcecaoDeDominio {

  private static final long serialVersionUID = 1L;

  public DocumentoInvalidoException(String detalhe) {
    super("Documento recusado", detalhe);
  }

  @Override
  public HttpStatus getStatus() {
    return HttpStatus.BAD_REQUEST;
  }
}
