package br.com.aerodash.aether.aeronave;

import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
import org.springframework.http.HttpStatus;

/**
 * Os totais mudaram entre a leitura e a correção — quase sempre um voo lançado no meio. Gravar por
 * cima apagaria o voo dos contadores sem ninguém perceber.
 */
public class ContadoresDesatualizadosException extends ExcecaoDeDominio {

  private static final long serialVersionUID = 1L;

  public ContadoresDesatualizadosException() {
    super(
        "Contadores desatualizados",
        "Os totais mudaram desde que você abriu a edição — provavelmente um voo foi lançado."
            + " Feche e abra a edição de novo para corrigir sobre os valores atuais.");
  }

  @Override
  public HttpStatus getStatus() {
    return HttpStatus.CONFLICT;
  }
}
