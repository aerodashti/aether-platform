package br.com.aerodash.aether.documento;

import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
import org.springframework.http.HttpStatus;

/**
 * O arquivo não entra: tipo fora da lista, vazio, grande demais ou arquivos demais no envio. A
 * recusa é sempre do campo {@code arquivos}, a parte do multipart que os traz.
 */
public class DocumentoInvalidoException extends ExcecaoDeDominio {

  private static final long serialVersionUID = 1L;

  private static final String CAMPO = "arquivos";

  public DocumentoInvalidoException(String detalhe) {
    super("Documento recusado", detalhe, CAMPO);
  }

  @Override
  public HttpStatus getStatus() {
    return HttpStatus.BAD_REQUEST;
  }
}
