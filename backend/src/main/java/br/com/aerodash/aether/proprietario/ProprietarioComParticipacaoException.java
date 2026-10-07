package br.com.aerodash.aether.proprietario;

import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
import org.springframework.http.HttpStatus;

/**
 * Desativar sem mais nem menos quem está num contrato vigente deixaria a fatia dele sem dono: ele
 * seguiria pagando o fixo sem poder receber custo nem voo. A saída redistribui antes de desativar.
 */
public class ProprietarioComParticipacaoException extends ExcecaoDeDominio {

  private static final long serialVersionUID = 1L;

  public ProprietarioComParticipacaoException(String nome) {
    super(
        "Proprietário com participação vigente",
        nome
            + " está num contrato vigente: redistribua a participação dele entre os demais antes de"
            + " desativar.");
  }

  @Override
  public HttpStatus getStatus() {
    return HttpStatus.CONFLICT;
  }
}
