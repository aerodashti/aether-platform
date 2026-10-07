package br.com.aerodash.aether.participacao;

import br.com.aerodash.aether.comum.erro.ExcecaoDeDominio;
import org.springframework.http.HttpStatus;

/**
 * Os contratos mudaram desde que a tela os carregou. Salvar mesmo assim arquivaria, sem ninguém
 * ver, a divisão que outra pessoa acabou de definir — ou deixaria de fora uma aeronave em que quem
 * sai acabou de entrar.
 */
public class ContratoDesatualizadoException extends ExcecaoDeDominio {

  private static final long serialVersionUID = 1L;

  private static final String TITULO = "Contrato desatualizado";

  private ContratoDesatualizadoException(String detalhe) {
    super(TITULO, detalhe);
  }

  /** Outro contrato entrou em vigor na aeronave desde que a edição foi aberta. */
  public static ContratoDesatualizadoException daAeronave(String matricula) {
    return new ContratoDesatualizadoException(
        "O contrato de participação da "
            + matricula
            + " mudou enquanto você editava. Confira a divisão atual e salve de novo.");
  }

  /** As aeronaves de quem sai não são mais as que o painel mostrava. */
  public static ContratoDesatualizadoException daSaida(String nome) {
    return new ContratoDesatualizadoException(
        "As aeronaves em que "
            + nome
            + " participa mudaram enquanto você redistribuía. Confira os contratos atuais e"
            + " confirme de novo.");
  }

  @Override
  public HttpStatus getStatus() {
    return HttpStatus.CONFLICT;
  }
}
