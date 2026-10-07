package br.com.aerodash.aether.manutencao;

import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
import org.springframework.http.HttpStatus;

/**
 * A manutenção já está no histórico, que é permanente: corrigi-la ou concluí-la de novo
 * reescreveria o registro. O caminho do engano é reabrir.
 */
public class ManutencaoConcluidaException extends ExcecaoDeDominio {

  private static final long serialVersionUID = 1L;

  public ManutencaoConcluidaException(String detalhe) {
    super("Manutenção concluída", detalhe);
  }

  @Override
  public HttpStatus getStatus() {
    return HttpStatus.CONFLICT;
  }
}
